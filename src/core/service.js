import config from '../config.json';

export const coreService = {
    getConfig: (key) => {
        if (key) return config[key] || false;
        return config || false;
    }
}