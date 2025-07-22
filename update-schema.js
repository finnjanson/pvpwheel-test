import { createClient } from "@supabase/supabase-js"

async function updateSupabaseSchema() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("--- Starting Supabase Schema Update ---")

  try {
    // Example: Add a new column to the 'games' table if it doesn't exist
    console.log('Checking for "nft_deposit_id" column in "games" table...')
    const { data: columns, error: columnsError } = await supabase.rpc("pg_columns_info", {
      table_name: "games",
      column_name: "nft_deposit_id",
    })

    if (columnsError) {
      console.warn(
        "Could not check column existence (pg_columns_info function might be missing). Attempting ALTER TABLE directly.",
      )
      // Proceed with ALTER TABLE, it will error if column exists
    }

    if (!columns || columns.length === 0) {
      console.log('Adding "nft_deposit_id" column to "games" table...')
      const { error: alterError } = await supabase.rpc("execute_sql", {
        sql_query: `
          ALTER TABLE public.games
          ADD COLUMN IF NOT EXISTS nft_deposit_id text,
          ADD COLUMN IF NOT EXISTS nft_deposit_amount numeric;
        `,
      })
      if (alterError) throw alterError
      console.log('"nft_deposit_id" and "nft_deposit_amount" columns added successfully.')
    } else {
      console.log('"nft_deposit_id" column already exists. Skipping addition.')
    }

    // Example: Add a new table if needed
    // console.log('Checking for "transactions" table...');
    // const { data: txTables, error: txTablesError } = await supabase
    //   .from('pg_tables')
    //   .select('tablename')
    //   .eq('schemaname', 'public')
    //   .eq('tablename', 'transactions');

    // if (txTablesError) throw txTablesError;

    // if (txTables.length === 0) {
    //   console.log('Creating "transactions" table...');
    //   const { error: createTxError } = await supabase.rpc('execute_sql', {
    //     sql_query: `
    //       CREATE TABLE public.transactions (
    //         id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    //         user_id text NOT NULL,
    //         amount numeric NOT NULL,
    //         type text NOT NULL, -- 'deposit', 'withdrawal', 'bet'
    //         game_id uuid REFERENCES public.games(id),
    //         created_at timestamp with time zone DEFAULT now() NOT NULL
    //       );
    //       ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
    //       CREATE POLICY "Enable read access for all users" ON public.transactions FOR SELECT USING (true);
    //       CREATE POLICY "Enable insert for authenticated users only" ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    //     `
    //   });
    //   if (createTxError) throw createTxError;
    //   console.log('"transactions" table created successfully.');
    // } else {
    //   console.log('"transactions" table already exists. Skipping creation.');
    // }

    console.log("Supabase schema update complete.")
  } catch (error) {
    console.error("Error during Supabase schema update:", error.message)
  }
}

updateSupabaseSchema()
