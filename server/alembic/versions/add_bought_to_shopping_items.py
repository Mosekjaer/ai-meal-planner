"""add bought to shopping items

Revision ID: add_bought_to_shopping_items
Revises: ebfea1ec6a36
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_bought_to_shopping_items'
down_revision = 'ebfea1ec6a36'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add bought column to shopping_items table
    op.add_column('shopping_items', sa.Column('bought', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    # Remove bought column from shopping_items table
    op.drop_column('shopping_items', 'bought') 