import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';
import { signIn } from '../api/auth';
import { messageFor } from '../api/problem';
import { ME } from '../app/queryClient';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { useCurrentUser } from './useCurrentUser';

type Credentials = { username: string; password: string };

export function LoginPage() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ defaultValues: { username: '', password: '' } });

  const submit = handleSubmit(async ({ username, password }) => {
    try {
      await signIn(username, password);
      await queryClient.invalidateQueries({ queryKey: ME });
      await navigate('/segreteria');
    } catch (error) {
      setError('root', { message: messageFor(error) });
    }
  });

  if (user) {
    return <Navigate to="/segreteria" replace />;
  }

  return (
    <div className="max-w-md space-y-6">
      <title>Accesso segreteria - Poliambulatorio Valdoria</title>
      <h1 className="text-3xl font-bold">Accesso segreteria</h1>
      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
        {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
        <Field
          label="Nome utente"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username', { required: 'Scrivi il nome utente.' })}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Scrivi la password.' })}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Accesso in corso…' : 'Accedi'}
        </Button>
      </form>
      <p className="border-l-8 border-rule bg-paper px-4 py-3 text-sm">
        Sito dimostrativo. Per provare: utente <strong>segreteria</strong> con password{' '}
        <strong>segreteria-demo</strong>, oppure <strong>admin</strong> con{' '}
        <strong>admin-demo</strong> per modificare orari e chiusure.
      </p>
    </div>
  );
}
