
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_audit_logs": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"detail": NonNullable<Json>,"id": number,"target_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_audit_logs_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_users": {
                  Row: {
                    "created_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_users_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_verifications": {
                  Row: {
                    "created_at": string,"document_path": string,"document_type": string,"id": string,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_path": string,"document_type": string,"id"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"document_path"?: string,"document_type"?: string,"id"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_verifications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "identity_verifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"likes": {
                  Row: {
                    "created_at": string,"from_user": string,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_user": string,"to_user": string
                  }
                  Update: {
                    "created_at"?: string,"from_user"?: string,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "likes_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "likes_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"id": string,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"user_a": string,"user_b": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"created_at": string,"id": number,"image_path": string | null,"match_id": string,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: never,"image_path"?: string | null,"match_id": string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: never,"image_path"?: string | null,"match_id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"ng_words": {
                  Row: {
                    "word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "word": string
                  }
                  Update: {
                    "word"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"body": string,"created_at": string,"id": number,"match_id": string | null,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: never,"match_id"?: string | null,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: never,"match_id"?: string | null,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"passes": {
                  Row: {
                    "created_at": string,"from_user": string,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_user": string,"to_user": string
                  }
                  Update: {
                    "created_at"?: string,"from_user"?: string,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "passes_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "passes_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_images": {
                  Row: {
                    "created_at": string,"id": string,"position": number,"status": string,"storage_path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"position"?: number,"status"?: string,"storage_path": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"position"?: number,"status"?: string,"storage_path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_images_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "axis_lead": number | null,"axis_passion": number | null,"axis_tempo": number | null,"axis_together": number | null,"bio": string,"birthdate": string,"city": string,"created_at": string,"display_name": string,"gender": string,"height": number | null,"hobbies": (string)[],"is_hidden": boolean,"lat": number | null,"lng": number | null,"location_updated_at": string | null,"love_type": string | null,"occupation": string,"pref_age_max": number,"pref_age_min": number,"pref_max_distance_km": number | null,"prefecture": string,"seeking": (string)[],"updated_at": string,"user_id": string,"value_answers": NonNullable<Json>,"verification_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "axis_lead"?: number | null,"axis_passion"?: number | null,"axis_tempo"?: number | null,"axis_together"?: number | null,"bio"?: string,"birthdate": string,"city"?: string,"created_at"?: string,"display_name": string,"gender": string,"height"?: number | null,"hobbies"?: (string)[],"is_hidden"?: boolean,"lat"?: number | null,"lng"?: number | null,"location_updated_at"?: string | null,"love_type"?: never,"occupation"?: string,"pref_age_max"?: number,"pref_age_min"?: number,"pref_max_distance_km"?: number | null,"prefecture": string,"seeking"?: (string)[],"updated_at"?: string,"user_id": string,"value_answers"?: NonNullable<Json>,"verification_status"?: string
                  }
                  Update: {
                    "axis_lead"?: number | null,"axis_passion"?: number | null,"axis_tempo"?: number | null,"axis_together"?: number | null,"bio"?: string,"birthdate"?: string,"city"?: string,"created_at"?: string,"display_name"?: string,"gender"?: string,"height"?: number | null,"hobbies"?: (string)[],"is_hidden"?: boolean,"lat"?: number | null,"lng"?: number | null,"location_updated_at"?: string | null,"love_type"?: never,"occupation"?: string,"pref_age_max"?: number,"pref_age_min"?: number,"pref_max_distance_km"?: number | null,"prefecture"?: string,"seeking"?: (string)[],"updated_at"?: string,"user_id"?: string,"value_answers"?: NonNullable<Json>,"verification_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "admin_note": string | null,"created_at": string,"detail": string,"handled_at": string | null,"handled_by": string | null,"id": string,"message_id": number | null,"reason": string,"reported_id": string,"reporter_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"created_at"?: string,"detail"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"message_id"?: number | null,"reason": string,"reported_id": string,"reporter_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "admin_note"?: string | null,"created_at"?: string,"detail"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"message_id"?: number | null,"reason"?: string,"reported_id"?: string,"reporter_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_id_fkey"
      columns: ["reported_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"current_period_end": string,"id": string,"plan": string,"provider": string,"provider_ref": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_period_end": string,"id"?: string,"plan"?: string,"provider"?: string,"provider_ref"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"current_period_end"?: string,"id"?: string,"plan"?: string,"provider"?: string,"provider_ref"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"last_seen_at": string,"status": string,"suspended_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id": string,"last_seen_at"?: string,"status"?: string,"suspended_reason"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"last_seen_at"?: string,"status"?: string,"suspended_reason"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_daily_stats":
{ Args: { "p_days"?: number }; Returns: {
              "active_users": number,"day": string,"likes": number,"matches": number,"messages": number,"signups": number
            }[]
                           },
"admin_grant_premium":
{ Args: { "p_days": number,"p_user": string }; Returns: undefined
                           },
"admin_review_verification":
{ Args: { "p_approve": boolean,"p_id": string,"p_note"?: string }; Returns: undefined
                           },
"admin_set_image_status":
{ Args: { "p_image": string,"p_status": string }; Returns: undefined
                           },
"admin_set_user_status":
{ Args: { "p_reason"?: string,"p_status": string,"p_user": string }; Returns: undefined
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_update_report":
{ Args: { "p_note"?: string,"p_report": string,"p_status": string }; Returns: undefined
                           },
"age_of":
{ Args: { "b": string }; Returns: number
                           },
"assert_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"audit":
{ Args: { "p_action": string,"p_detail"?: Json,"p_target": string }; Returns: undefined
                           },
"build_card":
{ Args: { "me": Omit<Database["public"]['Tables']["profiles"]['Row'], Database["public"]['Tables']["profiles"]['ComputedFields']>,"p": Omit<Database["public"]['Tables']["profiles"]['Row'], Database["public"]['Tables']["profiles"]['ComputedFields']>,"p_last_seen": string,"t_lead": number,"t_n": number,"t_passion": number,"t_tempo": number,"t_together": number }; Returns: Database["public"]['CompositeTypes']["profile_card"]
                          SetofOptions: {
        from: "*"
        to: "profile_card"
        isOneToOne: true
        isSetofReturn: false
      } },
"can_send_message":
{ Args: { "uid": string }; Returns: boolean
                           },
"can_view_profile":
{ Args: { "target": string }; Returns: boolean
                           },
"contains_ng_word":
{ Args: { "input": string }; Returns: boolean
                           },
"daily_like_limit":
{ Args: { "uid": string }; Returns: number
                           },
"distance_km":
{ Args: { "lat1": number,"lat2": number,"lng1": number,"lng2": number }; Returns: number
                           },
"distance_label":
{ Args: { "d": number }; Returns: string
                           },
"get_likes_received":
{ Args: Record<PropertyKey, never>; Returns: {
              "card": Database["public"]['CompositeTypes']["profile_card"],"liked_at": string,"masked": boolean
            }[]
                           },
"get_likes_sent":
{ Args: Record<PropertyKey, never>; Returns: {
              "card": Database["public"]['CompositeTypes']["profile_card"],"liked_at": string
            }[]
                           },
"get_matches":
{ Args: Record<PropertyKey, never>; Returns: {
              "card": Database["public"]['CompositeTypes']["profile_card"],"last_message": string,"last_message_at": string,"last_sender": string,"match_id": string,"matched_at": string,"unread": number
            }[]
                           },
"get_my_status":
{ Args: Record<PropertyKey, never>; Returns: {
              "can_send_message": boolean,"has_profile": boolean,"is_admin": boolean,"is_premium": boolean,"likes_limit": number,"likes_received": number,"likes_used": number,"status": string,"unread_messages": number,"unread_notifications": number,"verification_status": string
            }[]
                           },
"get_notifications":
{ Args: { "p_limit"?: number }; Returns: {
              "actor_id": string,"actor_name": string,"actor_photo": string,"body": string,"created_at": string,"id": number,"match_id": string,"read_at": string,"type": string
            }[]
                           },
"get_profile_detail":
{ Args: { "p_user": string }; Returns: Database["public"]['CompositeTypes']["profile_card"][]
                          SetofOptions: {
        from: "*"
        to: "profile_card"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_recommendations":
{ Args: { "p_limit"?: number }; Returns: Database["public"]['CompositeTypes']["profile_card"][]
                          SetofOptions: {
        from: "*"
        to: "profile_card"
        isOneToOne: false
        isSetofReturn: true
      } },
"is_active_user":
{ Args: { "uid": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_compatible_pair":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_discoverable":
{ Args: { "me": Omit<Database["public"]['Tables']["profiles"]['Row'], Database["public"]['Tables']["profiles"]['ComputedFields']>,"p": Omit<Database["public"]['Tables']["profiles"]['Row'], Database["public"]['Tables']["profiles"]['ComputedFields']> }; Returns: boolean
                           },
"is_match_member":
{ Args: { "p_match": string,"uid": string }; Returns: boolean
                           },
"is_premium":
{ Args: { "uid": string }; Returns: boolean
                           },
"likes_used_today":
{ Args: { "uid": string }; Returns: number
                           },
"mark_messages_read":
{ Args: { "p_match": string }; Returns: number
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (number)[] }; Returns: undefined
                           },
"my_taste":
{ Args: { "uid": string }; Returns: Record<string, unknown>
                           },
"notify":
{ Args: { "p_actor": string,"p_body": string,"p_match": string,"p_type": string,"p_user": string }; Returns: undefined
                           },
"require_my_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "axis_lead": number | null,
"axis_passion": number | null,
"axis_tempo": number | null,
"axis_together": number | null,
"bio": string,
"birthdate": string,
"city": string,
"created_at": string,
"display_name": string,
"gender": string,
"height": number | null,
"hobbies": (string)[],
"is_hidden": boolean,
"lat": number | null,
"lng": number | null,
"location_updated_at": string | null,
"love_type": string | null,
"occupation": string,
"pref_age_max": number,
"pref_age_min": number,
"pref_max_distance_km": number | null,
"prefecture": string,
"seeking": (string)[],
"updated_at": string,
"user_id": string,
"value_answers": NonNullable<Json>,
"verification_status": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_profiles":
{ Args: { "p_age_max"?: number,"p_age_min"?: number,"p_hobby"?: string,"p_limit"?: number,"p_love_type"?: string,"p_max_distance_km"?: number,"p_offset"?: number,"p_prefecture"?: string,"p_sort"?: string,"p_verified_only"?: boolean }; Returns: Database["public"]['CompositeTypes']["profile_card"][]
                          SetofOptions: {
        from: "*"
        to: "profile_card"
        isOneToOne: false
        isSetofReturn: true
      } },
"submit_identity_verification":
{ Args: { "p_document_path": string,"p_document_type": string }; Returns: undefined
                           },
"touch_last_seen":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"try_uuid":
{ Args: { "t": string }; Returns: string
                           },
"unmatch":
{ Args: { "p_match": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            "profile_card": {
                        "user_id": string | null,"display_name": string | null,"age": number | null,"gender": string | null,"prefecture": string | null,"city": string | null,"bio": string | null,"occupation": string | null,"height": number | null,"hobbies": (string)[] | null,"love_type": string | null,"value_answers": Json | null,"verified": boolean | null,"distance": string | null,"last_active": string | null,"photos": (string)[] | null,"score": number | null,"reasons": (string)[] | null,"liked": boolean | null,"match_id": string | null
                      }
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
