/**
 * Barril de los servicios de Pull Request (Fase 2, paso 6).
 */

export {
  NOTA_PR_VINCULADO,
  cerrarPullRequest,
  crearPullRequest,
  listarRamasParaPullRequest,
} from './pullRequests';
export type {
  EntradaCerrarPR,
  EntradaCrearPullRequest,
  EntradaListarRamas,
  PullRequestCreado,
} from './pullRequests';
