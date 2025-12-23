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
    type: process.env.type,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.private_key_id,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.client_id,
    auth_uri: process.env.auth_uri,
    token_uri: process.env.token_uri,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url,
    universe_domain: process.env.universe_domain,
  };
}

class FirebaseConnection {
  private static instance: FirebaseConnection;
  public db: Firestore;

  private constructor() {
    if (!admin.apps.length) {
      const firebaseConfig = {
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      };

      admin.initializeApp(firebaseConfig);
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