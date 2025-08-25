import {onRequest} from 'firebase-functions/v2/https';
import {getFirestore} from 'firebase-admin/firestore';
import {initializeApp} from 'firebase-admin/app';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

initializeApp();
const db = getFirestore();

export const login = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*'); // For testing
  if (request.method !== 'POST') return response.status(405).send('Method Not Allowed');
  const {username, password} = request.body;
  const userSnap = await db.collection('users').where('username', '==', username).get();
  if (userSnap.empty) return response.status(401).send('Invalid credentials');
  const user = userSnap.docs[0].data();
  if (!bcrypt.compareSync(password, user.password_hash)) return response.status(401).send('Invalid credentials');
  const token = jwt.sign({id: user.id, role: user.role}, process.env.JWT_SECRET, {expiresIn: '1h'});
  response.json({token});
});