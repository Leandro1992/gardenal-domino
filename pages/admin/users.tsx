import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { InputWithLabel } from '@/components/ui/input-with-label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2, Key, Trash2, Edit } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    } else if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao criar usuário');
      }

      setSuccess('Usuário criado com sucesso!');
      setNewUser({ email: '', name: '', password: '', role: 'user' });
      setShowNewUserForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Digite a nova senha:');
    if (!newPassword) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao alterar senha');
      }

      alert('Senha alterada com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateName = async (userId: string, currentName: string) => {
    const newName = prompt('Digite o novo nome:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao alterar nome');
      }

      setSuccess('Nome alterado com sucesso!');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Gerenciar Usuários
          </h1>
          <p className="text-gray-600 mt-1">
            Crie e gerencie usuários do sistema
          </p>
        </div>
        <Button onClick={() => setShowNewUserForm(!showNewUserForm)}>
          <UserPlus className="mr-2 h-5 w-5" />
          Novo Usuário
        </Button>
      </div>

      {(error || success) && (
        <div className={`rounded-lg p-4 ${error ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-sm ${error ? 'text-red-800' : 'text-green-800'}`}>
            {error || success}
          </p>
        </div>
      )}

      {showNewUserForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <InputWithLabel
                label="Nome"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nome do usuário"
                required
              />

              <InputWithLabel
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />

              <InputWithLabel
                label="Senha"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                required
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Tipo
                </label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value as 'admin' | 'user' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="w-full">
                  Criar Usuário
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewUserForm(false)}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {u.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateName(u.id, u.name)}
                      title="Editar nome"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResetPassword(u.id)}
                      title="Redefinir senha"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
