import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import { useEffect } from 'react';

import BaseInformation from './pages/BaseInfomation';
import { config } from './config';
import Callback from './pages/Callback';
import { GetLoginUrl } from './Api';

function App() {
  const { backendUrl } = config;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/login') {
      const redirectToLogin = async () => {
        try {
          const loginUrlResponse = await GetLoginUrl();
          window.location.replace(loginUrlResponse);
        } catch (error) {
          console.error("获取登录URL失败:", error);
        }
      };

      redirectToLogin();
    }

    if (location.pathname === '/callback') {
      return;
    }

    const accessToken = localStorage.getItem('refresh_token');

    if (!accessToken) {
      navigate('/login');
    }

  }, [backendUrl, navigate, location.pathname]);

  return (
      <Routes>
        <Route path='/' element={<BaseInformation/ >} />
        <Route path='callback' element={<Callback />} />
        <Route path='login' element={<>正在重定向到登录页面...</>} />
      </Routes>
  )
}

export default App
