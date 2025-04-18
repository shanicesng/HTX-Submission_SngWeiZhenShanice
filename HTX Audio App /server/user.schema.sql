CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    pw VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS audio (
    id SERIAL PRIMARY KEY,
    audio_category VARCHAR(50) NOT NULL,
    audio_description VARCHAR(10000) NOT NULL,
    s3_url VARCHAR(255) NOT NULL,
    created_at VARCHAR(50) NOT NULL,
    username VARCHAR(255) NOT NULL, 
    file_name VARCHAR(255) NOT NULL
);