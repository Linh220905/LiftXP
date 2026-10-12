-- BẢNG QUẢN LÝ BÀI TẬP LIFTXP TRÊN SUPABASE (POSTGRESQL)

-- 1. Tạo Enum phân loại
CREATE TYPE exercise_category AS ENUM ('gym', 'home', 'calisthenics');
CREATE TYPE exercise_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE exercise_force AS ENUM ('push', 'pull', 'static');

-- 2. Tạo Bảng Exercises
CREATE TABLE IF NOT EXISTS public.exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_vi TEXT NOT NULL,
    category exercise_category NOT NULL,
    equipment TEXT NOT NULL,
    primary_muscles TEXT[] NOT NULL,
    secondary_muscles TEXT[] DEFAULT '{}',
    level exercise_level NOT NULL DEFAULT 'beginner',
    mechanic TEXT DEFAULT 'compound',
    force exercise_force DEFAULT 'push',
    instructions TEXT[] DEFAULT '{}',
    thumbnail_url TEXT NOT NULL,
    image_end_url TEXT,
    motion_gif_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tạo Index tối ưu tìm kiếm theo nhóm cơ & môi trường tập
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON public.exercises USING GIN(primary_muscles);

-- 4. Bật Row Level Security (RLS) để Client đọc an toàn
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép tất cả người dùng đọc dữ liệu bài tập"
ON public.exercises FOR SELECT
TO authenticated, anon
USING (true);
