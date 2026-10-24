import { RouterProvider } from 'react-router';
import { router } from '@/app/rutas';

export default function App() {
  return <RouterProvider router={router} />;
}
