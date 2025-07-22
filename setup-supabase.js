import { createClient } from "@supabase/supabase-js"

async function setupSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.")
    console.error("Please set them in your .env file or Vercel project settings.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log("--- Setting up Supabase Database ---")

  try {
    // Check if 'games' table exists, if not, create it
    const { data: tables, error: tablesError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")
      .eq("tablename", "games")

    if (tablesError) throw tablesError

    if (tables.length === 0) {
      console.log('Creating "games" table...')
      const { error: createError } = await supabase.rpc("execute_sql", {
        sql_query: `
          CREATE TABLE public.games (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            created_at timestamp with time zone DEFAULT now() NOT NULL,
            roll_number integer,
            status text DEFAULT 'waiting'::text NOT NULL,
            player1_id text,
            player2_id text,
            winner_id text,
            start_time timestamp with time zone,
            end_time timestamp with time zone,
            bet_amount numeric,
            nft_deposit_id text,
            nft_deposit_amount numeric
          );
          ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Enable read access for all users" ON public.games FOR SELECT USING (true);
          CREATE POLICY "Enable insert for authenticated users only" ON public.games FOR INSERT WITH CHECK (auth.role() = 'authenticated');
          CREATE POLICY "Enable update for authenticated users only" ON public.games FOR UPDATE USING (auth.role() = 'authenticated');
        `,
      })
      if (createError) throw createError
      console.log('"games" table created successfully.')
    } else {
      console.log('"games" table already exists. Skipping creation.')
    }

    // Check if 'gifts' table exists, if not, create it
    const { data: giftTables, error: giftTablesError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")
      .eq("tablename", "gifts")

    if (giftTablesError) throw giftTablesError

    if (giftTables.length === 0) {
      console.log('Creating "gifts" table...')
      const { error: createGiftError } = await supabase.rpc("execute_sql", {
        sql_query: `
          CREATE TABLE public.gifts (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            name text NOT NULL,
            description text,
            image_url text,
            value numeric NOT NULL,
            created_at timestamp with time zone DEFAULT now() NOT NULL
          );
          ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Enable read access for all users" ON public.gifts FOR SELECT USING (true);
          CREATE POLICY "Enable insert for authenticated users only" ON public.gifts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        `,
      })
      if (createGiftError) throw createGiftError
      console.log('"gifts" table created successfully.')

      // Seed initial gifts
      console.log("Seeding initial gifts...")
      const { error: seedError } = await supabase.from("gifts").insert([
        {
          name: "Small Gift",
          description: "A small token of appreciation",
          image_url: "/images/gifts-icon.png",
          value: 10,
        },
        { name: "Medium Gift", description: "A decent reward", image_url: "/images/gifts-icon.png", value: 50 },
        { name: "Large Gift", description: "A generous present", image_url: "/images/gifts-icon.png", value: 100 },
      ])
      if (seedError) throw seedError
      console.log("Initial gifts seeded.")
    } else {
      console.log('"gifts" table already exists. Skipping creation and seeding.')
    }

    console.log("Supabase setup complete.")
  } catch (error) {
    console.error("Error during Supabase setup:", error.message)
  }
}

setupSupabase()
