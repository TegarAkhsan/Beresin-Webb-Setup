import { prisma } from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (req, res) => {
    try {
        const { name, email, password, password_confirmation } = req.body;

        // Validation
        if (!name || !email || !password) {
            res.cookie('errors', JSON.stringify({ message: 'All fields are required.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        if (password !== password_confirmation) {
            res.cookie('errors', JSON.stringify({ password: 'The password confirmation does not match.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            res.cookie('errors', JSON.stringify({ email: 'The email has already been taken.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const user = await prisma.users.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'customer',
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect('/dashboard'); 
    } catch (error) {
        console.error('[REGISTRATION ERROR DETAILS]', {
            message: error.message,
            stack: error.stack,
            code: error.code // Prisma error codes
        });

        res.cookie('flash_error', `Registration failed: ${error.message}`);
        return res.redirect(req.get('Referer') || '/');
    }
}


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.users.findUnique({ where: { email } });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.cookie('errors', JSON.stringify({ email: 'These credentials do not match our records.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('[LOGIN ERROR DETAILS]', {
            message: error.message,
            stack: error.stack
        });
        res.cookie('flash_error', `Login failed: ${error.message}`);
        return res.redirect(req.get('Referer') || '/');
    }
}


export const logout = (req, res) => {
    res.clearCookie('token');
    return res.redirect('/');
}
