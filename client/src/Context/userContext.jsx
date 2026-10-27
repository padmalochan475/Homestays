import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await axios.get("/user/profile");
        const normalized = data ? { ...data, _id: data._id || data.id, id: data.id || data._id } : null;
        setUser(normalized);
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("Unable to load the current user", error);
        }
        setUser(null);
        localStorage.removeItem("token");
      } finally {
        setReady(true);
      }
    };

    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, ready }}>
      {children}
    </UserContext.Provider>
  );
}
