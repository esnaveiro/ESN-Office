export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      volunteers: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          position: string | null
          status: 'available' | 'dnd' | 'break' | 'remote'
          is_in_office: boolean
          last_seen: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          position?: string | null
          status?: 'available' | 'dnd' | 'break' | 'remote'
          is_in_office?: boolean
          last_seen?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          position?: string | null
          status?: 'available' | 'dnd' | 'break' | 'remote'
          is_in_office?: boolean
          last_seen?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          id: string
          volunteer_id: string
          date: string
          start_time: string
          end_time: string
          confirmation_type: 'firm' | 'flex' | 'confirmed'
          created_at: string
        }
        Insert: {
          id?: string
          volunteer_id: string
          date: string
          start_time: string
          end_time: string
          confirmation_type: 'firm' | 'flex' | 'confirmed'
          created_at?: string
        }
        Update: {
          id?: string
          volunteer_id?: string
          date?: string
          start_time?: string
          end_time?: string
          confirmation_type?: 'firm' | 'flex' | 'confirmed'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          }
        ]
      }
      presence_logs: {
        Row: {
          id: string
          volunteer_id: string
          action: 'check_in' | 'check_out'
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          volunteer_id: string
          action: 'check_in' | 'check_out'
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          volunteer_id?: string
          action?: 'check_in' | 'check_out'
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_logs_volunteer_id_fkey"
            columns: ["volunteer_id"]
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          }
        ]
      }
      scheduled_checkins: {
        Row: {
          id: string
          volunteer_id: string
          scheduled_datetime: string
          action: 'check_in' | 'check_out'
          status: 'pending' | 'completed' | 'cancelled' | 'failed'
          auto_execute: boolean
          notes: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          volunteer_id: string
          scheduled_datetime: string
          action: 'check_in' | 'check_out'
          status?: 'pending' | 'completed' | 'cancelled' | 'failed'
          auto_execute?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          volunteer_id?: string
          scheduled_datetime?: string
          action?: 'check_in' | 'check_out'
          status?: 'pending' | 'completed' | 'cancelled' | 'failed'
          auto_execute?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_checkins_volunteer_id_fkey"
            columns: ["volunteer_id"]
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory: {
        Row: {
          id: string
          name: string
          description: string | null
          quantity: number
          unit: string
          location: string
          category: string | null
          notes: string | null
          low_stock_threshold: number | null
          created_by_id: string | null
          created_by_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          quantity?: number
          unit?: string
          location: string
          category?: string | null
          notes?: string | null
          low_stock_threshold?: number | null
          created_by_id?: string | null
          created_by_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          quantity?: number
          unit?: string
          location?: string
          category?: string | null
          notes?: string | null
          low_stock_threshold?: number | null
          created_by_id?: string | null
          created_by_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_created_by_id_fkey"
            columns: ["created_by_id"]
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_logs: {
        Row: {
          id: string
          inventory_id: string
          action: 'created' | 'updated' | 'deleted'
          changed_by_id: string | null
          changed_by_name: string
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          changes_description: string
          created_at: string
        }
        Insert: {
          id?: string
          inventory_id: string
          action: 'created' | 'updated' | 'deleted'
          changed_by_id?: string | null
          changed_by_name: string
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          changes_description?: string
          created_at?: string
        }
        Update: {
          id?: string
          inventory_id?: string
          action?: 'created' | 'updated' | 'deleted'
          changed_by_id?: string | null
          changed_by_name?: string
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          changes_description?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_changed_by_id_fkey"
            columns: ["changed_by_id"]
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          }
        ]
      }
      office_reservations: {
        Row: {
          id: string
          reserved_by_id: string
          reserved_by_name: string
          start_time: string
          end_time: string
          reason: string | null
          is_active: boolean
          additional_volunteers: string[] | null
          cancelled_at: string | null
          cancelled_by_id: string | null
          cancelled_by_name: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reserved_by_id: string
          reserved_by_name: string
          start_time: string
          end_time: string
          reason?: string | null
          is_active?: boolean
          additional_volunteers?: string[] | null
          cancelled_at?: string | null
          cancelled_by_id?: string | null
          cancelled_by_name?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reserved_by_id?: string
          reserved_by_name?: string
          start_time?: string
          end_time?: string
          reason?: string | null
          is_active?: boolean
          additional_volunteers?: string[] | null
          cancelled_at?: string | null
          cancelled_by_id?: string | null
          cancelled_by_name?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_reservations_reserved_by_id_fkey"
            columns: ["reserved_by_id"]
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      board_settings: {
        Row: {
          id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_reservation: {
        Args: Record<string, never>
        Returns: {
          id: string
          reserved_by_id: string
          reserved_by_name: string
          start_time: string
          end_time: string
          reason: string | null
          is_active: boolean
          additional_volunteers: string[] | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
