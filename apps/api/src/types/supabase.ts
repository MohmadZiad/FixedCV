export interface Database {
  public: {
    Tables: {
      CVs: {
        Row: {
          id: string;
          userId: string | null;
          originalFilename: string;
          storagePath: string;
          parsedText: string | null;
          lang: string | null;
          createdAt: string;
          updatedAt: string | null;
        };
        Insert: {
          id: string;
          userId?: string | null;
          originalFilename: string;
          storagePath: string;
          parsedText?: string | null;
          lang?: string | null;
          createdAt?: string;
          updatedAt?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['CVs']['Insert'], 'id'>>;
      };
      Jobs: {
        Row: {
          id: string;
          title: string;
          description: string;
          createdAt: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          createdAt?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['Jobs']['Insert'], 'id'>>;
      };
      JobRequirements: {
        Row: {
          id: string;
          jobId: string;
          requirement: string;
          mustHave: boolean;
          weight: number;
          createdAt: string;
        };
        Insert: {
          id: string;
          jobId: string;
          requirement: string;
          mustHave?: boolean;
          weight?: number;
          createdAt?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['JobRequirements']['Insert'], 'id'>>;
      };
      Analysis: {
        Row: {
          id: string;
          jobId: string;
          cvId: string;
          status: string;
          score: number | null;
          breakdown: any | null;
          gaps: any | null;
          model: string | null;
          createdAt: string;
          updatedAt: string | null;
        };
        Insert: {
          id: string;
          jobId: string;
          cvId: string;
          status: string;
          score?: number | null;
          breakdown?: any | null;
          gaps?: any | null;
          model?: string | null;
          createdAt?: string;
          updatedAt?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['Analysis']['Insert'], 'id'>>;
      };
      AnalysisChunks: {
        Row: {
          id: string;
          analysisId: string;
          chunkIndex: number;
          section: string | null;
          content: string;
          strength: number | null;
          createdAt: string;
        };
        Insert: {
          id: string;
          analysisId: string;
          chunkIndex: number;
          section?: string | null;
          content: string;
          strength?: number | null;
          createdAt?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['AnalysisChunks']['Insert'], 'id'>>;
      };
    };
  };
}
