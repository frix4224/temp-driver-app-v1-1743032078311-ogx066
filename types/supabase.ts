export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      drivers: {
        Row: {
          id: string
          email: string | null
          name: string
          contact_number: string | null
          address: string | null
          license_number: string
          vehicle_type: string
          vehicle_number: string
          status: boolean | null
          notes: string | null
          profile_image: string | null
          created_at: string | null
          updated_at: string | null
          user_id: string | null
          driver_code: number
        }
        Insert: {
          id?: string
          email?: string | null
          name: string
          contact_number?: string | null
          address?: string | null
          license_number: string
          vehicle_type: string
          vehicle_number: string
          status?: boolean | null
          notes?: string | null
          profile_image?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          driver_code: number
        }
        Update: {
          id?: string
          email?: string | null
          name?: string
          contact_number?: string | null
          address?: string | null
          license_number?: string
          vehicle_type?: string
          vehicle_number?: string
          status?: boolean | null
          notes?: string | null
          profile_image?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          driver_code?: number
        }
      }
    }
  }
}