export interface Folder {
  name: string;
}

export interface FileItem {
  title: string;
  folder: string;
  type: 'pdf' | 'ppt' | 'video';
  file: string; // URL path or ObjectURL for local files
  isLocal?: boolean;
  createdAt?: string;
  blobPath?: string; // Key in IndexedDB for the file blob
}

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  enabled: boolean;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
  enabled: boolean;
}
