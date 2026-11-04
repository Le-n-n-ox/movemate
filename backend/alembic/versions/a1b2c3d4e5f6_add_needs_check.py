"""add needs_check and detection_confidence to items

Revision ID: a1b2c3d4e5f6
Revises: 9c24b3c02db7
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c24b3c02db7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('items', sa.Column('needs_check', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('items', sa.Column('detection_confidence', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('items', 'detection_confidence')
    op.drop_column('items', 'needs_check')
