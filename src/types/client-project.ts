export interface Client {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  company_id: string;
  name: string;
  created_at: string;
}