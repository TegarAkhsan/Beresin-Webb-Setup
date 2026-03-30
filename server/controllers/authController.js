import { prisma } from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (req, res) => {
    try {
        const { name, email, password, password_confirmation } = req.body;

        if (password !== password_confirmation) {
            return res.status(422).json({ errors: { password: ['The password confirmation does not match.'] } });
        }

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(422).json({ errors: { email: ['The email has already been taken.'] } });
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

        // Redirect is handled by client in Inertia, but Inertia-Node expects redirect back or intended
        return res.redirect('/dashboard'); 
    } catch (error) {
        console.error('Registration Error', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.users.findUnique({ where: { email } });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(422).json({ errors: { email: ['These credentials do not match our records.'] } });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('Login Error', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export const logout = (req, res) => {
    res.clearCookie('token');
    return res.redirect('/');
}
