import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

api.interceptors.request.use((config) => {
  console.log('API Request:', {
    method: config.method,
    url: config.url,
    data: config.data,
    headers: config.headers
  });
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  async (error) => {
    console.error('API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      detail: error.response?.data?.detail,
      message: error.message,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        data: JSON.parse(error.config?.data || '{}')
      }
    });

    const originalRequest = error.config;

    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken
          });

          const { access_token, refresh_token } = response.data;
          
          
          localStorage.setItem('token', access_token);
          localStorage.setItem('refreshToken', refresh_token);

          
          onRefreshed(access_token);
          isRefreshing = false;

          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          
          isRefreshing = false;
          refreshSubscribers = [];
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.reload();
          return Promise.reject(refreshError);
        }
      } else {
        
        return new Promise(resolve => {
          subscribeTokenRefresh(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
    }
    return Promise.reject(error);
  }
);


export const login = async (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  try {
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const { access_token, refresh_token } = response.data;
    if (!access_token || !refresh_token) {
      throw new Error('No tokens received');
    }
    localStorage.setItem('token', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    console.log('Tokens stored:', access_token.substring(0, 10) + '...');
    return access_token;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (email: string, password: string, name: string) => {
  return api.post('/auth/register', { email, password, name });
};

export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};


export const getUserPreferences = async () => {
  return api.get('/users/preferences');
};

export const updateUserPreferences = async (preferences: {
  dietary_restrictions: string[];
  calories_per_day: number;
  meal_complexity: string;
  cuisine_preferences: string[];
}) => {
  return api.put('/users/preferences', preferences);
};


export const getCommonIngredients = async () => {
  return api.get('/ingredients/common');
};

export const getUserIngredients = async () => {
  return api.get('/ingredients/user');
};

export const addUserIngredient = async (ingredient: {
  name: string;
  quantity: number;
  unit: string;
  emoji?: string;
  default_unit: string;
}) => {
  return api.post('/ingredients/user', ingredient);
};

export const updateUserIngredient = async (id: number, ingredient: {
  name: string;
  quantity: number;
  unit: string;
}) => {
  return api.put(`/ingredients/user/${id}`, ingredient);
};

export const deleteUserIngredient = async (id: number) => {
  return api.delete(`/ingredients/user/${id}`);
};


export const generateRecipe = async (params: {
  dietary_restrictions: string[];
  cuisine_type: string;
  difficulty: string;
}) => {
  return api.post('/recipes/generate', params);
};

export const getRecipe = async (id: number) => {
  return api.get(`/recipes/${id}`);
};

export const generateMealPlan = async (params: {
  dietary_restrictions: string[];
  calories_per_day: number;
  meal_complexity: string;
  cuisine_preferences: string[];
  meal_types: ("breakfast" | "lunch" | "dinner")[];
}, days: number) => {
  console.log('Generating meal plan with params:', JSON.stringify(params, null, 2));
  try {
    const response = await api.post(`/meal-plans/generate?days=${days}`, { preferences: params });
    console.log('Meal plan generation success:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error: any) {
    console.error('Meal plan generation error details:', {
      status: error.response?.status,
      data: error.response?.data,
      detail: error.response?.data?.detail,
      message: error.message,
      requestData: JSON.parse(error.config?.data || '{}')
    });
    throw error;
  }
};

export const generateMealPlanForWeek = async (params: {
  dietary_restrictions: string[];
  calories_per_day: number;
  meal_complexity: string;
  cuisine_preferences: string[];
  meal_types: ("breakfast" | "lunch" | "dinner")[];
  week_info: {
    year: number;
    week_number: number;
  };
}, days: number) => {
  console.log('Generating meal plan for week with params:', JSON.stringify(params, null, 2));
  try {
    
    const { week_info, ...preferences } = params;
    const response = await api.post(`/meal-plans/generate?days=${days}`, {
      preferences,
      week_info
    });
    console.log('Generated specific week plan:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error: any) {
    console.error('Meal plan generation error details:', {
      status: error.response?.status,
      data: error.response?.data,
      detail: error.response?.data?.detail,
      message: error.message,
      requestData: JSON.parse(error.config?.data || '{}')
    });
    throw error;
  }
};

export const getCurrentWeekMealPlan = async () => {
  return api.get('/meal-plans/current');
};

export const getSpecificWeekMealPlan = async (year: number, weekNumber: number) => {
  return api.get(`/meal-plans/week/${year}/${weekNumber}`);
};

export const updateMealInPlan = async (params: {
  day_index: number;
  meal_type: string;
  request: string;
}) => {
  return api.put('/meal-plans/current/meals', params);
};

export const getCurrentMealPlan = async () => {
  return api.get('/meal-plans/current');
};


export const getCurrentShoppingList = async () => {
  try {
    const response = await api.get('/shopping-list/current');
    return validateShoppingListResponse(response.data);
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    throw error;
  }
};

export const getWeekShoppingList = async (year: number, weekNumber: number) => {
  try {
    const response = await api.get(`/shopping-list/week/${year}/${weekNumber}`);
    return validateShoppingListResponse(response.data);
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    throw error;
  }
};

export const updateShoppingItemStatus = async (itemId: number, bought: boolean) => {
  try {
    const response = await api.patch(`/shopping-list/items/${itemId}`, { bought });
    if (response.data && response.data.id) {
      return response.data;
    }
    throw new Error('Invalid response from update shopping item');
  } catch (error) {
    console.error('Error updating shopping item:', error);
    throw error;
  }
};


const validateShoppingListResponse = (response: any) => {
  if (Array.isArray(response)) {
    const validItems = response.filter(item => item && item.name && typeof item.id === 'number');
    const invalidItems = response.filter(item => !item || !item.name || typeof item.id !== 'number');
    
    if (invalidItems.length > 0) {
      console.warn('Found invalid shopping items:', invalidItems);
    }
    
    console.log('Valid shopping items:', validItems);
    return validItems;
  } else {
    console.error('Unexpected shopping list response format:', response);
    return [];
  }
};


export const getMealDetails = async (dayIndex: number, mealType: string) => {
  return api.get(`/meal-plans/current/meals/${dayIndex}/${mealType}`);
};


export const updateMealServings = async (params: {
  day_index: number;
  meal_type: string;
  servings: number;
}) => {
  return api.put('/meal-plans/current/servings', params);
};

export const updateAllMealServings = async (servings: number) => {
  return api.put('/meal-plans/current/servings/bulk', { servings });
};


export const getProfile = async () => {
  return api.get('/users/profile');
};

export const updateProfile = async (profile: {
  name?: string;
  email?: string;
  language?: string;
}) => {
  return api.put('/users/profile', profile);
};

export default api; 