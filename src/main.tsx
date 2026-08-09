import ReactDOM from 'react-dom/client';
import App from './app/App';
import { AppProviders } from './app/providers';
import './styles/theme.css';
import './styles/globals.css';
import './styles/components.css';
import './styles/layout.css';

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <AppProviders>
    <App />
  </AppProviders>,
);
