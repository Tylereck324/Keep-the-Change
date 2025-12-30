-- Add deleted_at column to categories for soft delete support
ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
