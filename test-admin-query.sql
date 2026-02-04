INSERT INTO users (firstName, lastName, email, password, role, cin, phone, createdAt, updatedAt) 
VALUES (
    'Admin', 
    'System', 
    'admin@example.com', 
    '$2a$10$XxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ', 
    'admin', 
    'ADMIN001', 
    '+212600000000', 
    NOW(), 
    NOW()
) 
ON DUPLICATE KEY UPDATE email=email;
