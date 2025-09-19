-- Create enum types
CREATE TYPE public.task_type AS ENUM ('daily', 'monthly', 'temporary');
CREATE TYPE public.task_urgency AS ENUM ('not_urgent', 'relatively_urgent', 'urgent');
CREATE TYPE public.task_status AS ENUM ('pending', 'delivered', 'not_delivered');
CREATE TYPE public.user_role AS ENUM ('ceo', 'collaborator');

-- Create sectors table
CREATE TABLE public.sectors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type task_type NOT NULL,
    sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE RESTRICT,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    urgency task_urgency NOT NULL DEFAULT 'not_urgent',
    status task_status NOT NULL DEFAULT 'pending',
    ceo_observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_history table for auditing
CREATE TABLE public.task_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    old_status task_status,
    new_status task_status NOT NULL,
    observation TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user roles
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'collaborator',
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sectors
CREATE POLICY "Anyone can view sectors" ON public.sectors FOR SELECT USING (true);
CREATE POLICY "Only CEO can manage sectors" ON public.sectors FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
);

-- Create RLS policies for tasks
CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Only CEO can manage tasks" ON public.tasks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
);

-- Create RLS policies for task_history
CREATE POLICY "Anyone can view task history" ON public.task_history FOR SELECT USING (true);
CREATE POLICY "Only CEO can create task history" ON public.task_history FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'ceo'
    )
);

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Insert default sectors
INSERT INTO public.sectors (name) VALUES ('Coordination'), ('HR');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        CASE 
            WHEN NEW.email = 'ceo@company.com' THEN 'ceo'::user_role
            ELSE 'collaborator'::user_role
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to log task status changes
CREATE OR REPLACE FUNCTION public.log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.task_history (task_id, old_status, new_status, observation)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.ceo_observation);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task status changes
CREATE TRIGGER log_task_status_change
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.log_task_status_change();