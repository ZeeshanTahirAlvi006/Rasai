import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrowserRouter } from 'react-router'
import { Toaster } from "react-hot-toast"
import { AuthProvider } from './context/AuthContext'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
      
    </BrowserRouter>
  </StrictMode>,
)
