-- Disable any notices to keep the output clean (optional, good for psql)
SET client_min_messages TO WARNING;

-- Drop tables if they exist to start fresh (useful for remaking the step)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS users;

-- Table 1: For storing user accounts (both students and employers)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('student', 'employer')), -- Ensures only these two types
    skills TEXT[], -- Array of strings for student skills
    requirements TEXT[], -- Array of strings for employer requirements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: For managing job applications
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    motivation TEXT, -- Reason for denial, provided by employer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: For sending notifications to users
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some indexes for better performance on common lookups
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_employer ON applications(employer_id);

-- Confirmation message
SELECT 'Database tables created successfully!' as status;
ALTER TABLE users
ADD COLUMN location VARCHAR(255);
