import request from 'supertest';
import { initDb, getDb, saveDb } from '../src/models/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import express from 'express';
import cors from 'cors';
import authRoutes from '../src/routes/auth';
import genRoutes from '../src/routes/generations';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

let app: express.Application;

// Clean up and initialize before all tests
beforeAll(async () => {
    // Remove test database if exists
    if (fs.existsSync('./data.db')) {
        fs.unlinkSync('./data.db');
    }

    // Remove test uploads directory
    if (fs.existsSync('./uploads')) {
        fs.rmSync('./uploads', { recursive: true, force: true });
    }

    // Initialize database first
    await initDb();

    // Then create app
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '12mb' }));
    app.use('/auth', authRoutes);
    app.use('/generations', genRoutes);
    app.get('/', (_req, res) => res.json({ ok: true }));
    app.use('/uploads', express.static('./uploads'));
});

beforeEach(() => {
    // Clear database before each test
    const db = getDb();
    db.exec('DELETE FROM generations');
    db.exec('DELETE FROM users');
    db.exec("DELETE FROM sqlite_sequence WHERE name='users'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='generations'");
    saveDb();
});

afterAll(() => {
    // Clean up test database
    if (fs.existsSync('./data.db')) {
        fs.unlinkSync('./data.db');
    }
});

describe('POST /auth/signup', () => {
    it('should create a new user with valid credentials', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');

        // Verify token is valid
        const decoded = jwt.verify(response.body.token, JWT_SECRET) as any;
        expect(decoded).toHaveProperty('userId');
        expect(typeof decoded.userId).toBe('number');
    });

    it('should hash the password before storing', async () => {
        const password = 'password123';
        await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password
            });

        const db = getDb();
        const stmt = db.prepare('SELECT password_hash FROM users WHERE email = ?');
        stmt.bind(['test@example.com']);
        stmt.step();
        const row = stmt.getAsObject();
        stmt.free();

        expect(row.password_hash).toBeDefined();
        expect(row.password_hash).not.toBe(password);

        const isValid = await bcrypt.compare(password, row.password_hash as string);
        expect(isValid).toBe(true);
    });

    it('should return 409 if email already exists', async () => {
        await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'different123'
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Email already exists');
    });

    it('should return 400 for invalid email format', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'notanemail',
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
        expect(response.body).toHaveProperty('issues');
    });

    it('should return 400 for password shorter than 6 characters', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: '12345'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
        expect(response.body).toHaveProperty('issues');
    });

    it('should return 400 for missing email', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should return 400 for missing password', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should return 400 for empty request body', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should not expose password hash in response', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.body).not.toHaveProperty('password_hash');
        expect(response.body).not.toHaveProperty('password');
    });
});

describe('POST /auth/login', () => {
    beforeEach(async () => {
        await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });
    });

    it('should login with valid credentials', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');

        const decoded = jwt.verify(response.body.token, JWT_SECRET) as any;
        expect(decoded).toHaveProperty('userId');
    });

    it('should return 401 for non-existent email', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for incorrect password', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid email format', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'notanemail',
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should return 400 for missing email', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                password: 'password123'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should return 400 for missing password', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com'
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should return 400 for empty password', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: ''
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid input');
    });

    it('should return valid JWT token on login', async () => {
        const response1 = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response1.status).toBe(200);
        expect(response1.body).toHaveProperty('token');

        // Verify token can be decoded
        const decoded = jwt.verify(response1.body.token, JWT_SECRET) as any;
        expect(decoded).toHaveProperty('userId');
        expect(decoded).toHaveProperty('exp');
        expect(decoded).toHaveProperty('iat');
    });

    it('should not expose password hash in response', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.body).not.toHaveProperty('password_hash');
        expect(response.body).not.toHaveProperty('password');
    });
});

describe('GET /auth/me', () => {
    it('should return user info with valid token', async () => {
        // Create user
        const signupResponse = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(signupResponse.status).toBe(200);
        const authToken = signupResponse.body.token;
        const decoded = jwt.verify(authToken, JWT_SECRET) as any;
        const userId = decoded.userId;

        // Verify user exists in database
        const db = getDb();
        const checkStmt = db.prepare('SELECT id, email FROM users WHERE id = ?');
        checkStmt.bind([userId]);
        const userExists = checkStmt.step();
        const userData = userExists ? checkStmt.getAsObject() : null;
        checkStmt.free();

        expect(userExists).toBe(true);
        expect(userData).toBeTruthy();

        // Get user info
        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('email', 'test@example.com');
        expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should return 401 without authorization header', async () => {
        const response = await request(app)
            .get('/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 with malformed authorization header', async () => {
        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', 'InvalidFormat');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', 'Bearer invalidtoken');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
        const expiredToken = jwt.sign(
            { userId: 999 },
            JWT_SECRET,
            { expiresIn: '-1h' }
        );

        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 with token signed with wrong secret', async () => {
        const wrongToken = jwt.sign(
            { userId: 999 },
            'wrong_secret',
            { expiresIn: '7d' }
        );

        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${wrongToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 404 if user was deleted', async () => {
        const signupResponse = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const authToken = signupResponse.body.token;
        const decoded = jwt.verify(authToken, JWT_SECRET) as any;
        const userId = decoded.userId;

        const db = getDb();
        db.exec(`DELETE FROM users WHERE id = ${userId}`);
        saveDb();

        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('should return 401 with Bearer token without space', async () => {
        const signupResponse = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const authToken = signupResponse.body.token;

        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer${authToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 401 with empty Bearer token', async () => {
        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', 'Bearer ');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
    });

    it('should work for different authenticated users', async () => {
        const signup1 = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const signup2 = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test2@example.com',
                password: 'password123'
            });

        const token1 = signup1.body.token;
        const token2 = signup2.body.token;
        const decoded1 = jwt.verify(token1, JWT_SECRET) as any;
        const decoded2 = jwt.verify(token2, JWT_SECRET) as any;

        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${token2}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(decoded2.userId);
        expect(response.body.email).toBe('test2@example.com');
        expect(response.body.id).not.toBe(decoded1.userId);
    });

    it('should not expose password hash in response', async () => {
        const signupResponse = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        const authToken = signupResponse.body.token;

        const response = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.body).not.toHaveProperty('password_hash');
        expect(response.body).not.toHaveProperty('password');
    });
});

describe('Authentication Integration Flow', () => {
    it('should complete full signup -> login -> me flow', async () => {
        // Signup
        const signupResponse = await request(app)
            .post('/auth/signup')
            .send({
                email: 'integration@example.com',
                password: 'password123'
            });

        expect(signupResponse.status).toBe(200);
        const signupToken = signupResponse.body.token;

        // Login
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: 'integration@example.com',
                password: 'password123'
            });

        expect(loginResponse.status).toBe(200);
        const loginToken = loginResponse.body.token;

        // Get user info with signup token
        const meResponse1 = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${signupToken}`);

        expect(meResponse1.status).toBe(200);
        expect(meResponse1.body.email).toBe('integration@example.com');

        // Get user info with login token
        const meResponse2 = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${loginToken}`);

        expect(meResponse2.status).toBe(200);
        expect(meResponse2.body.email).toBe('integration@example.com');
        expect(meResponse2.body.id).toBe(meResponse1.body.id);
    });

    it('should handle multiple users independently', async () => {
        const user1 = await request(app)
            .post('/auth/signup')
            .send({
                email: 'user1@example.com',
                password: 'password123'
            });

        const user2 = await request(app)
            .post('/auth/signup')
            .send({
                email: 'user2@example.com',
                password: 'password456'
            });

        const me1 = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${user1.body.token}`);

        expect(me1.status).toBe(200);
        expect(me1.body.email).toBe('user1@example.com');

        const me2 = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${user2.body.token}`);

        expect(me2.status).toBe(200);
        expect(me2.body.email).toBe('user2@example.com');
        expect(me1.body.id).not.toBe(me2.body.id);
    });
});

describe('Security Tests', () => {
    it('should handle special characters in password', async () => {
        const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: specialPassword
            });

        expect(response.status).toBe(200);

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: specialPassword
            });

        expect(loginResponse.status).toBe(200);
    });

    it('should handle unicode characters in password', async () => {
        const unicodePassword = 'пароль密码🔐123456';
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: unicodePassword
            });

        expect(response.status).toBe(200);

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: unicodePassword
            });

        expect(loginResponse.status).toBe(200);
    });

    it('should reject very short passwords', async () => {
        const response = await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: '123'
            });

        expect(response.status).toBe(400);
    });

    it('should be case-sensitive for passwords', async () => {
        await request(app)
            .post('/auth/signup')
            .send({
                email: 'test@example.com',
                password: 'Password123'
            });

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(401);
    });
});