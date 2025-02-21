import { Global, Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: () => {
        return createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_KEY!,
        );
      },
    },
    SupabaseService,
  ],
  exports: [SupabaseService],
})
export class SupabaseModule {}
