export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StoreGoal =
  | "sales"
  | "roas"
  | "conversion"
  | "traffic"
  | "trust"
  | "other";

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          website_url: string;
          goal: StoreGoal;
          platform: string;
          stage: string;
          traffic_source: string;
          aov_bucket: string;
          country: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          website_url: string;
          goal: StoreGoal;
          platform?: string;
          stage?: string;
          traffic_source?: string;
          aov_bucket?: string;
          country?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: "trialing" | "active" | "past_due" | "canceled";
          trial_start: string;
          trial_end: string;
          advice_consumed: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "free" | "starter" | "pro" | "elite" | "business" | "lifetime";
          current_period_end: string | null;
          ends_at: string | null;
          source: "stripe" | "manual";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "trialing" | "active" | "past_due" | "canceled";
          trial_start: string;
          trial_end: string;
          advice_consumed?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "starter" | "pro" | "elite" | "business" | "lifetime";
          current_period_end?: string | null;
          ends_at?: string | null;
          source?: "stripe" | "manual";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      scans: {
        Row: {
          id: string;
          store_id: string;
          status: "queued" | "running" | "succeeded" | "failed";
          progress?: number;
          step?: string | null;
          started_at: string | null;
          finished_at: string | null;
          score_global: number | null;
          scores_json: Json | null;
          issues_json: Json | null;
          trial_single_advice: string | null;
          scan_data_json: Json | null;
          summary: string | null;
          error_message: string | null;
          error_code?: string | null;
          debug?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          status?: "queued" | "running" | "succeeded" | "failed";
          progress?: number;
          step?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          score_global?: number | null;
          scores_json?: Json | null;
          issues_json?: Json | null;
          trial_single_advice?: string | null;
          scan_data_json?: Json | null;
          summary?: string | null;
          error_message?: string | null;
          error_code?: string | null;
          debug?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scans"]["Insert"]>;
      };
      scan_events: {
        Row: {
          id: number;
          scan_id: string;
          ts: string;
          type: string;
          message: string;
          payload: Json | null;
        };
        Insert: {
          id?: number;
          scan_id: string;
          ts?: string;
          type?: string;
          message: string;
          payload?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["scan_events"]["Insert"]>;
      };
      coach_messages: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coach_messages"]["Insert"]>;
      };
      user_onboarding: {
        Row: {
          user_id: string;
          completed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          completed?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_onboarding"]["Insert"]>;
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          type: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          type: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_events"]["Insert"]>;
      };
    };
  };
}
