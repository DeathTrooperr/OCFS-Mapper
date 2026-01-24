export interface ObservablePattern {
    typeId: number;
    name: string;
    regex: RegExp;
}

export const OBSERVABLE_PATTERNS: ObservablePattern[] = [
    { typeId: 2, name: 'IP Address', regex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/ },
    { typeId: 2, name: 'IPv6 Address', regex: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/ },
    { typeId: 3, name: 'MAC Address', regex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/ },
    { typeId: 5, name: 'Email Address', regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    { typeId: 6, name: 'URL', regex: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/ },
    { typeId: 8, name: 'MD5 Hash', regex: /^[a-fA-F0-9]{32}$/ },
    { typeId: 8, name: 'SHA-1 Hash', regex: /^[a-fA-F0-9]{40}$/ },
    { typeId: 8, name: 'SHA-256 Hash', regex: /^[a-fA-F0-9]{64}$/ },
    { typeId: 1, name: 'Hostname', regex: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/ },
    { typeId: 12, name: 'Subnet', regex: /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2]))$/ },
];

export const OCSF_TYPE_TO_OBSERVABLE: Record<string, number> = {
    'hostname_t': 1,
    'ip_t': 2,
    'ipv4_t': 2,
    'ipv6_t': 2,
    'mac_t': 3,
    'user_name_t': 4,
    'email_t': 5,
    'url_t': 6,
    'file_name_t': 7,
    'hash_t': 8,
    'process_name_t': 9,
    'port_t': 11,
    'subnet_t': 12,
    'country_code_t': 14,
    'file_path_t': 45,
    // Object types
    'user': 21,
    'email': 22,
    'url': 23,
    'file': 24,
    'process': 25,
    'geo_location': 26,
    'container': 27,
    'registry_key': 28,
    'registry_value': 29,
    'fingerprint': 30,
    'endpoint': 20
};

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

export function detectObservableTypeId(value: any): number | null {
    if (typeof value !== 'string') return null;
    
    for (const pattern of OBSERVABLE_PATTERNS) {
        if (pattern.regex.test(value)) {
            return pattern.typeId;
        }
    }
    
    return null;
}
