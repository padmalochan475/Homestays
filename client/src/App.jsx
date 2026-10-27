import "./App.css";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import Layout from "./Components/Layout";
import IndexPage from "./Pages/IndexPage";
import RegisterPage from "./Pages/RegisterPage";
import axios from "axios";
import { UserContextProvider } from "./Context/userContext";
import ProfilePage from "./Pages/ProfilePage";
import SinglePlacePage from "./Pages/SinglePlacePage";
import AddPlacePage from "./Pages/AddPlacePage";
import { Slide, ToastContainer } from "react-toastify";

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").trim().replace(/\/+$/, "");
const resolvedBaseUrl = /^https?:\/\//i.test(rawApiUrl)
  ? rawApiUrl
  : `https://${rawApiUrl}`;

axios.defaults.baseURL = resolvedBaseUrl;
axios.defaults.withCredentials = true;

// Attach Authorization header if token exists in localStorage (essential for cross-domain / Render deployments)
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  return (
    <UserContextProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<IndexPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<ProfilePage />} />
          <Route path="/account/:subpage" element={<ProfilePage />} />
          <Route path="/account/:subpage/:action" element={<ProfilePage />} />
          <Route path="/account/places/new" element={<AddPlacePage />} />
          <Route path="/account/places/:id" element={<AddPlacePage />} />
          <Route path="/place/:id" element={<SinglePlacePage />} />
        </Route>
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        transition={Slide}
      />
    </UserContextProvider>
  );
}

export default App;
