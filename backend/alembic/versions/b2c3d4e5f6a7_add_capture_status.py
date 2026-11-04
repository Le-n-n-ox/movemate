"""add capture status and item frames_seen

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for name, typ in [("status", sa.String(length=16)), ("progress", sa.Float()), ("stage", sa.String(length=200)), ("error", sa.Text()), ("item_count", sa.Integer()), ("frames_seen", sa.Integer()), ("frames_total", sa.Integer())]:
        op.add_column('captures', sa.Column(name, typ, server_default="0" if name in ("progress", "item_count", "frames_seen", "frames_total") else ("queued" if name == "status" else None), nullable=True))
    op.add_column('items', sa.Column('frames_seen', sa.Integer(), nullable=True))
    op.add_column('items', sa.Column('frames_total', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('items', 'frames_total')
    op.drop_column('items', 'frames_seen')
    for name in ["frames_total", "frames_seen", "item_count", "error", "stage", "progress", "status"]:
        op.drop_column('captures', name)
