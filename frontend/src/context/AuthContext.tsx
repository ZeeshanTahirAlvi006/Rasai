import React,{createContext,useContext,useState,useEffect} from 'react'
import API,{setInMemoryToken} from '../api/api';
export interface IUser{
    _id:string,
    username:string,
    email:string,
    verified:boolean
}

export interface AuthContextType{
    accessToken:string|null,
    user:IUser|null,
    loading:boolean,
    setAccessToken:(token:string|null)=>void,
    setUser:(user:IUser|null)=>void;
    logout:()=>Promise<void>;
    logoutAll:()=>Promise<void>;
}

const AuthContext = createContext<AuthContextType|undefined>(undefined);
export const AuthProvider:React.FC<{children:React.ReactNode}>=({children})=>{
    const [accessToken, setAccessTokenState] = useState<string | null>(() => {
        return typeof window !== 'undefined' ? localStorage.getItem('ndr_access_token') : null;
    });
    const [user, setUser] = useState<IUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const setAccessToken = (token: string | null) => {
        setAccessTokenState(token);
        setInMemoryToken(token);
    };

    useEffect(() => {
        const refreshSession = async () => {
            try {
                const response = await API.post("/auth/refresh-token");
                const token = response.data?.data?.accessToken || response.data?.accessToken;
                if (token) {
                    setAccessToken(token);
                    setUser(response.data?.data?.user || response.data?.user || null);
                }
            } catch (error) {
                // If we already have a token stored locally, preserve it for testing
                const stored = localStorage.getItem('ndr_access_token');
                if (stored) {
                    setAccessToken(stored);
                }
            } finally {
                setLoading(false);
            }
        };
        refreshSession();
    }, []);

    const logout= async()=>{
        try {
            await API.post("/auth/logout")
        } catch (error:any) {
            console.error(error.response?.data||error?.message)
        }finally{
            setAccessToken(null)
            setUser(null);
        }
    };

    const logoutAll=async()=>{
        try {
            await API.post("/auth/logout-all")
        } catch (error:any) {
            console.error(error.response.data)
        }finally{
            setAccessToken(null)
            setUser(null)
        }
    }
    return (
        <AuthContext.Provider
        value={
            {accessToken,
                user,
                loading,
                setAccessToken,
                setUser,
                logout,
                logoutAll,
            }
        }>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth=():AuthContextType=>{
    const context = useContext(AuthContext);
    if(!context){
        throw new Error("useAuth myst be used within an AuthProvider")
    }
    return context
}