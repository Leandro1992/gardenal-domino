import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

export type FirestoreTimestamp = admin.firestore.Timestamp;

interface ServiceAccount {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

let serviceAccount: ServiceAccount | null = null;

try {
  // Tenta ler o arquivo de configuração
  serviceAccount = require('./credenciais.json');
} catch (error) {
  // Se o arquivo de configuração não estiver disponível, use variáveis de ambiente
  console.log('Arquivo de configuração não encontrado. Usando variáveis de ambiente.');
  serviceAccount = {
    type: process.env.FIREBASE_TYPE || process.env.type,
    project_id: process.env.FIREBASE_PROJECT_ID || process.env.project_id,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || process.env.private_key_id,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || process.env.private_key || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email,
    client_id: process.env.FIREBASE_CLIENT_ID || process.env.client_id,
    auth_uri: process.env.FIREBASE_AUTH_URI || process.env.auth_uri,
    token_uri: process.env.FIREBASE_TOKEN_URI || process.env.token_uri,
    auth_provider_x509_cert_url:
      process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || process.env.client_x509_cert_url,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || process.env.universe_domain,
  };
}

class FirebaseConnection {
  private static instance: FirebaseConnection;
  public db: Firestore;

  private constructor() {
    if (!admin.apps.length) {
      if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
        throw new Error('Firebase credentials are missing. Check credenciais.json or FIREBASE_* env vars.');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
    }
    this.db = admin.firestore();
  }

  static getInstance(): FirebaseConnection {
    if (!this.instance) {
      this.instance = new FirebaseConnection();
    }
    return this.instance;
  }
}

export default FirebaseConnection;