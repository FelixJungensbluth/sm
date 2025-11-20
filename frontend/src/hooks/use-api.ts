import {Api} from "@/services/api/api";
import {useContext} from "react";
import {ApiContext} from "@/contexts/api-context";


export const useApi = (): Api<unknown> => {
    const context = useContext(ApiContext);
    if (!context) throw new Error("useApi must be used within ApiProvider");
    return context;
};
  