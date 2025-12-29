-- Add auto_rollover_budget column to households table
alter table households
add column if not exists auto_rollover_budget boolean not null default false;

-- Add comment
comment on column households.auto_rollover_budget is 'Automatically copy budget to next month';
