import { createDeltaclawActions } from './main'
import type { AppModule } from '../shared/app-types'

export const app: AppModule = {
  id: 'deltaclaw',
  name: 'Deltaclaw',
  pageTitle: 'Deltaclaw Settings',
  connectLabel: 'Connect glasses',
  actionLabel: 'Refresh channels',
  initialStatus: 'Ready — start proxy first (just proxy)',
  createActions: createDeltaclawActions,
}

export default app
