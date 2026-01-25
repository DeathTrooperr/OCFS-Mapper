export interface ObservablePattern {
    typeId: number;
    name: string;
    regex: RegExp;
}

export const OBSERVABLE_PATTERNS: ObservablePattern[] = [
    { typeId: 2, name: 'IP Address', regex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/ },
    { typeId: 2, name: 'IPv6 Address', regex: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/ },
    { typeId: 12, name: 'Subnet', regex: /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2]))$/ },
    { typeId: 3, name: 'MAC Address', regex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/ },
    { typeId: 5, name: 'Email Address', regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    { typeId: 6, name: 'URL', regex: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/ },
    { typeId: 16, name: 'User Agent', regex: /^Mozilla\/[0-9]\.[0-9].+$/ },
    { typeId: 8, name: 'MD5 Hash', regex: /^[a-fA-F0-9]{32}$/ },
    { typeId: 8, name: 'SHA-1 Hash', regex: /^[a-fA-F0-9]{40}$/ },
    { typeId: 8, name: 'SHA-256 Hash', regex: /^[a-fA-F0-9]{64}$/ },
    { typeId: 8, name: 'SHA-512 Hash', regex: /^[a-fA-F0-9]{128}$/ },
    { typeId: 45, name: 'Unix Path', regex: /^\/([^\/\0]+\/)+[^\/\0]*$/ },
    { typeId: 45, name: 'Windows Path', regex: /^[a-zA-Z]:\\(?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]*$/ },
    { typeId: 46, name: 'Registry Key', regex: /^(HKEY_LOCAL_MACHINE|HKLM|HKEY_CURRENT_USER|HKCU|HKEY_CLASSES_ROOT|HKCR|HKEY_USERS|HKU|HKEY_CURRENT_CONFIG|HKCC)\\.+/i },
    { typeId: 1, name: 'Hostname', regex: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/ },
];
export const OBSERVABLE_TYPE_NAMES: Record<number, string> = {
    0: 'Unknown',
    1: 'Hostname',
    2: 'IP Address',
    3: 'MAC Address',
    4: 'User Name',
    5: 'Email Address',
    6: 'URL String',
    7: 'File Name',
    8: 'Hash',
    9: 'Process Name',
    10: 'Resource UID',
    11: 'Port',
    12: 'Subnet',
    13: 'Command Line',
    14: 'Country',
    15: 'Process ID',
    16: 'HTTP User-Agent',
    17: 'CWE Object: uid',
    18: 'CVE Object: uid',
    19: 'User Credential ID',
    20: 'Endpoint',
    21: 'User',
    22: 'Email',
    23: 'Uniform Resource Locator',
    24: 'File',
    25: 'Process',
    26: 'Geo Location',
    27: 'Container',
    28: 'Registry Key',
    29: 'Registry Value',
    30: 'Fingerprint',
    31: 'User Object: uid',
    32: 'Group Object: name',
    33: 'Group Object: uid',
    34: 'Account Object: name',
    35: 'Account Object: uid',
    36: 'Script Content',
    37: 'Serial Number',
    38: 'Resource Details Object: name',
    39: 'Process Entity Object: uid',
    40: 'Email Object: subject',
    41: 'Email Object: uid',
    42: 'Message UID',
    43: 'Registry Value Object: name',
    44: 'Advisory Object: uid',
    45: 'File Path',
    46: 'Registry Key Path',
    47: 'Device Object: uid',
    48: 'Network Endpoint Object: uid',
    99: 'Other'
};

export function detectObservableTypeId(value: any, key?: string): number | null {
    if (value === null || value === undefined) return null;
    
    const str = String(value);
    if (str.length === 0) return null;

    const normalizedKey = key?.toLowerCase() || '';

    // 1. High confidence patterns (IP, MAC, Email, URL, Hash, Path)
    // These are specific enough that we can trust them regardless of the key
    for (const pattern of OBSERVABLE_PATTERNS) {
        if (pattern.typeId === 1) continue; // Skip Hostname for now
        if (pattern.regex.test(str)) {
            return pattern.typeId;
        }
    }

    // 2. Key-based heuristics for ambiguous values
    // If the value matches Hostname regex (broad), use the key to disambiguate
    const hostnamePattern = OBSERVABLE_PATTERNS.find(p => p.typeId === 1);
    if (hostnamePattern && hostnamePattern.regex.test(str)) {
        // First try key hints as they are more specific than just checking for a dot
        if (normalizedKey) {
            const USER_KEYWORDS = ['user', 'username', 'login', 'account', 'actor', 'subject', 'principal'];
            const HOST_KEYWORDS = ['host', 'hostname', 'server', 'node', 'device', 'endpoint', 'computer', 'fqdn', 'domain'];
            const FILE_KEYWORDS = ['file', 'path', 'filename', 'filepath', 'exe', 'process'];

            // Split path into parts and check from right to left (leaf to root)
            // This ensures that 'user.host' is treated as a host, and 'host.user' as a user.
            const parts = normalizedKey.split(/[\._]/).reverse();
            for (const part of parts) {
                if (USER_KEYWORDS.some(k => part.includes(k))) return 4; // User Name
                if (HOST_KEYWORDS.some(k => part.includes(k))) return 1; // Hostname
                if (FILE_KEYWORDS.some(k => part.includes(k))) return 7; // File Name
            }
        }

        // If no key hint, but it has a dot, it's very likely a hostname or domain
        if (str.includes('.')) return 1;
        
        // If no key hint and no dot, it's too ambiguous to call it a Hostname (e.g. "admin", "success", "info")
        return null;
    }
    
    return null;
}
