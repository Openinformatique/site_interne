export interface User {
  id: string;
  index: number;
  isActive: boolean;
  picture: string;
  age: number;
  name: string;
  gender: string;
  company: string;
  email: string;
  phone: string;
  disabled?: boolean;
}