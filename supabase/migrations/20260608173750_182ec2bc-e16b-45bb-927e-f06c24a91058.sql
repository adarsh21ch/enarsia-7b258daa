
-- 1) Schema extensions
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_prospects_user_demo ON public.prospects(user_id) WHERE is_demo = true;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS demo_notice_seen boolean NOT NULL DEFAULT false;

-- 2) Master demo sheet table
CREATE TABLE IF NOT EXISTS public.demo_leads_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  phone2 text,
  email text,
  age_or_dob text,
  gender text,
  address text,
  state text,
  profession text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_leads_master TO authenticated;
GRANT ALL ON public.demo_leads_master TO service_role;
ALTER TABLE public.demo_leads_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read demo master" ON public.demo_leads_master;
CREATE POLICY "Authenticated read demo master" ON public.demo_leads_master
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage demo master" ON public.demo_leads_master;
CREATE POLICY "Admin manage demo master" ON public.demo_leads_master
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email = 'teamnevorai@gmail.com'))
  WITH CHECK (EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email = 'teamnevorai@gmail.com'));

-- 3) Feature flag
INSERT INTO public.admin_feature_flags(feature_key, feature_name, description, free_access, pro_access, trial_access, is_enabled, category, required_tier, module)
VALUES ('demo_leads_enabled','Demo Leads Onboarding','Auto-seed 50 demo leads on first login',true,true,true,true,'onboarding','basic','application')
ON CONFLICT (feature_key) DO NOTHING;

-- 4) Seed master rows (only if table empty). Phones are fake/un-dialable.
INSERT INTO public.demo_leads_master(name,phone,phone2,email,age_or_dob,gender,address,state,profession,sort_order)
SELECT v.* FROM (VALUES
  ('Rohan Kumar','7000010001','7000020001','rohan.kumar1@example.com','02-11-1997','Male','Delhi','Delhi','Architect',1),
  ('Vihaan Shah','7000010002','7000020002','vihaan.shah2@example.com','07-09-1986','Male','Pune','Maharashtra','Business Owner',2),
  ('Tanvi Bansal','7000010003','7000020003','tanvi.bansal3@example.com','03-04-1987','Female','Coimbatore','Tamil Nadu','Consultant',3),
  ('Vivaan Khan','7000010004','7000020004','vivaan.khan4@example.com','21-04-1988','Male','Visakhapatnam','Andhra Pradesh','Teacher',4),
  ('Manish Khan','7000010005','7000020005','manish.khan5@example.com','08-01-1997','Male','Pune','Maharashtra','Architect',5),
  ('Anika Mehta','7000010006','7000020006','anika.mehta6@example.com','18-03-1998','Female','Bengaluru','Karnataka','Photographer',6),
  ('Ayaan Bhatt','7000010007','7000020007','ayaan.bhatt7@example.com','19-02-1990','Male','Visakhapatnam','Andhra Pradesh','Sales Manager',7),
  ('Karan Patel','7000010008','7000020008','karan.patel8@example.com','03-12-2002','Male','Visakhapatnam','Andhra Pradesh','Teacher',8),
  ('Aishwarya Iyer','7000010009','7000020009','aishwarya.iyer9@example.com','18-11-2000','Female','Patna','Bihar','Insurance Agent',9),
  ('Rajesh Khan','7000010010','7000020010','rajesh.khan10@example.com','10-06-1999','Male','Ahmedabad','Gujarat','Marketing Executive',10),
  ('Deepak Nair','7000010011','7000020011','deepak.nair11@example.com','10-10-1987','Male','Nagpur','Maharashtra','Civil Engineer',11),
  ('Pooja Kapoor','7000010012','7000020012','pooja.kapoor12@example.com','03-10-1994','Female','Bengaluru','Karnataka','Pharmacist',12),
  ('Amit Reddy','7000010013','7000020013','amit.reddy13@example.com','16-03-1995','Male','Patna','Bihar','Teacher',13),
  ('Nikhil Singh','7000010014','7000020014','nikhil.singh14@example.com','26-10-2002','Male','Lucknow','Uttar Pradesh','Insurance Agent',14),
  ('Neha Roy','7000010015','7000020015','neha.roy15@example.com','26-10-2000','Female','Chandigarh','Chandigarh','Business Owner',15),
  ('Mohit Singh','7000010016','7000020016','mohit.singh16@example.com','23-08-1993','Male','Delhi','Delhi','Teacher',16),
  ('Pranav Mehta','7000010017','7000020017','pranav.mehta17@example.com','23-05-1999','Male','Bhopal','Madhya Pradesh','Real Estate Agent',17),
  ('Aanya Kapoor','7000010018','7000020018','aanya.kapoor18@example.com','20-03-1996','Female','Bengaluru','Karnataka','Civil Engineer',18),
  ('Vivaan Iyer','7000010019','7000020019','vivaan.iyer19@example.com','24-03-1994','Male','Ahmedabad','Gujarat','Banker',19),
  ('Rahul Malhotra','7000010020','7000020020','rahul.malhotra20@example.com','15-03-1987','Male','Bhopal','Madhya Pradesh','Architect',20),
  ('Priya Kumar','7000010021','7000020021','priya.kumar21@example.com','09-09-1998','Female','Patna','Bihar','Real Estate Agent',21),
  ('Nikhil Agarwal','7000010022','7000020022','nikhil.agarwal22@example.com','03-03-1992','Male','Hyderabad','Telangana','Doctor',22),
  ('Ishaan Nair','7000010023','7000020023','ishaan.nair23@example.com','27-08-1985','Male','Visakhapatnam','Andhra Pradesh','Marketing Executive',23),
  ('Priya Mehta','7000010024','7000020024','priya.mehta24@example.com','14-03-1985','Female','Coimbatore','Tamil Nadu','Real Estate Agent',24),
  ('Anil Khan','7000010025','7000020025','anil.khan25@example.com','23-03-1995','Male','Nagpur','Maharashtra','Content Creator',25),
  ('Sandeep Verma','7000010026','7000020026','sandeep.verma26@example.com','26-11-1999','Male','Coimbatore','Tamil Nadu','Banker',26),
  ('Ananya Agarwal','7000010027','7000020027','ananya.agarwal27@example.com','16-02-1997','Female','Bhopal','Madhya Pradesh','Teacher',27),
  ('Krishna Singh','7000010028','7000020028','krishna.singh28@example.com','06-08-1991','Male','Bengaluru','Karnataka','Insurance Agent',28),
  ('Anil Verma','7000010029','7000020029','anil.verma29@example.com','19-01-1988','Male','Chennai','Tamil Nadu','Architect',29),
  ('Myra Shah','7000010030','7000020030','myra.shah30@example.com','28-02-1985','Female','Kolkata','West Bengal','Content Creator',30),
  ('Rahul Kumar','7000010031','7000020031','rahul.kumar31@example.com','20-06-1993','Male','Indore','Madhya Pradesh','Civil Engineer',31),
  ('Vihaan Patel','7000010032','7000020032','vihaan.patel32@example.com','16-08-2000','Male','Kochi','Kerala','Student',32),
  ('Saanvi Kumar','7000010033','7000020033','saanvi.kumar33@example.com','11-12-1988','Female','Surat','Gujarat','Civil Engineer',33),
  ('Mohit Reddy','7000010034','7000020034','mohit.reddy34@example.com','07-01-2001','Male','Nagpur','Maharashtra','Real Estate Agent',34),
  ('Arjun Bhatt','7000010035','7000020035','arjun.bhatt35@example.com','10-09-1985','Male','Delhi','Delhi','Entrepreneur',35),
  ('Anjali Shah','7000010036','7000020036','anjali.shah36@example.com','25-06-1990','Female','Ahmedabad','Gujarat','Architect',36),
  ('Rohit Chopra','7000010037','7000020037','rohit.chopra37@example.com','08-11-1995','Male','Noida','Uttar Pradesh','Sales Manager',37),
  ('Harsh Nair','7000010038','7000020038','harsh.nair38@example.com','26-12-1997','Male','Ahmedabad','Gujarat','Sales Manager',38),
  ('Anjali Malhotra','7000010039','7000020039','anjali.malhotra39@example.com','01-12-1996','Female','Mumbai','Maharashtra','Entrepreneur',39),
  ('Vikram Gupta','7000010040','7000020040','vikram.gupta40@example.com','20-12-1991','Male','Indore','Madhya Pradesh','HR Manager',40),
  ('Harsh Shah','7000010041','7000020041','harsh.shah41@example.com','08-02-1996','Male','Bengaluru','Karnataka','Designer',41),
  ('Meera Iyer','7000010042','7000020042','meera.iyer42@example.com','16-04-1995','Female','Noida','Uttar Pradesh','Content Creator',42),
  ('Mohit Sharma','7000010043','7000020043','mohit.sharma43@example.com','12-11-2000','Male','Delhi','Delhi','Accountant',43),
  ('Aryan Agarwal','7000010044','7000020044','aryan.agarwal44@example.com','06-08-1991','Male','Patna','Bihar','Insurance Agent',44),
  ('Saanvi Agarwal','7000010045','7000020045','saanvi.agarwal45@example.com','24-07-1999','Female','Delhi','Delhi','Marketing Executive',45),
  ('Sai Kumar','7000010046','7000020046','sai.kumar46@example.com','19-03-1985','Male','Chandigarh','Chandigarh','Doctor',46),
  ('Anil Roy','7000010047','7000020047','anil.roy47@example.com','12-11-2000','Male','Chennai','Tamil Nadu','Architect',47),
  ('Divya Kumar','7000010048','7000020048','divya.kumar48@example.com','26-01-1985','Female','Bengaluru','Karnataka','Pharmacist',48),
  ('Pranav Kumar','7000010049','7000020049','pranav.kumar49@example.com','27-04-1998','Male','Kolkata','West Bengal','Software Engineer',49),
  ('Reyansh Iyer','7000010050','7000020050','reyansh.iyer50@example.com','08-09-1994','Male','Visakhapatnam','Andhra Pradesh','Insurance Agent',50)
) AS v(name,phone,phone2,email,age_or_dob,gender,address,state,profession,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.demo_leads_master);

-- 5) Seeder function (idempotent, runs on first login)
CREATE OR REPLACE FUNCTION public.seed_demo_data_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already boolean;
  v_enabled boolean;
  v_sheet_id uuid;
  v_signup_noon timestamptz;
  v_idx int := 0;
  v_count int := 0;
  v_master record;
  v_action text;
  v_stage text;
  v_personal text;
  v_action_at timestamptz;
  v_funnel_at timestamptz;
  v_prospect_id uuid;
BEGIN
  -- Auth check: only the user themselves (or admin) can trigger their seed
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'teamnevorai@gmail.com') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT demo_data_created INTO v_already FROM public.profiles WHERE user_id = p_user_id;
  IF v_already IS NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'no_profile');
  END IF;
  IF v_already = true THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_seeded');
  END IF;

  SELECT COALESCE(is_enabled,false) INTO v_enabled FROM public.admin_feature_flags WHERE feature_key='demo_leads_enabled';
  IF NOT COALESCE(v_enabled,false) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'disabled');
  END IF;

  -- Default tags
  INSERT INTO public.custom_options(user_id, option_type, option_value, sort_order, is_filter_tag, is_active)
  VALUES
    (p_user_id,'action_taken','Video Send',1,false,true),
    (p_user_id,'action_taken','Registration',2,true,true),
    (p_user_id,'funnel_stage','Day 1',1,false,true),
    (p_user_id,'funnel_stage','Day 2',2,false,true),
    (p_user_id,'funnel_stage','Day 3',3,false,true),
    (p_user_id,'personal_tag','Not Picked',1,false,true),
    (p_user_id,'personal_tag','Callback',2,false,true),
    (p_user_id,'personal_tag','Busy',3,false,true),
    (p_user_id,'personal_tag','Not Interested',4,false,true)
  ON CONFLICT DO NOTHING;

  -- Demo sheet container
  INSERT INTO public.sheets(user_id, name, is_demo)
  VALUES (p_user_id, 'Demo Leads', true)
  RETURNING id INTO v_sheet_id;

  -- 12:00 IST today (= 06:30 UTC)
  v_signup_noon := (date_trunc('day', (now() AT TIME ZONE 'Asia/Kolkata')) + interval '12 hours') AT TIME ZONE 'Asia/Kolkata';

  FOR v_master IN
    SELECT * FROM public.demo_leads_master ORDER BY sort_order, created_at LIMIT 50
  LOOP
    v_idx := v_idx + 1;
    v_action := NULL; v_stage := NULL; v_personal := NULL; v_funnel_at := NULL;
    v_action_at := v_signup_noon + (interval '60 minutes' * (v_idx - 1) / 50.0);

    IF v_idx BETWEEN 1 AND 10 THEN
      v_action := 'Video Send';
    ELSIF v_idx BETWEEN 11 AND 20 THEN
      v_action := 'Registration';
      v_funnel_at := v_action_at + interval '10 seconds';
      IF v_idx <= 15 THEN v_stage := 'Day 1';
      ELSIF v_idx <= 18 THEN v_stage := 'Day 2';
      ELSE v_stage := 'Day 3';
      END IF;
    ELSIF v_idx BETWEEN 21 AND 35 THEN v_personal := 'Not Picked';
    ELSIF v_idx BETWEEN 36 AND 42 THEN v_personal := 'Busy';
    ELSIF v_idx BETWEEN 43 AND 47 THEN v_personal := 'Callback';
    ELSE v_personal := 'Not Interested';
    END IF;

    INSERT INTO public.prospects(
      user_id, sheet_id, name, phone, phone2, email, age_or_dob, gender, address, state, profession,
      action_taken, action_taken_at, funnel_stage, funnel_stage_at,
      personal_tags, is_demo, date_added
    ) VALUES (
      p_user_id, v_sheet_id, v_master.name, v_master.phone, v_master.phone2, v_master.email,
      v_master.age_or_dob, v_master.gender, v_master.address, v_master.state, v_master.profession,
      v_action, v_action_at, v_stage, v_funnel_at,
      CASE WHEN v_personal IS NOT NULL THEN ARRAY[v_personal] ELSE NULL END,
      true, v_action_at
    ) RETURNING id INTO v_prospect_id;

    INSERT INTO public.activity_logs(user_id, prospect_id, activity_type, description, new_value, created_at)
    VALUES (
      p_user_id, v_prospect_id,
      CASE WHEN v_personal IS NOT NULL THEN 'personal_tag'
           WHEN v_action IS NOT NULL THEN 'tag_change'
           ELSE 'stage_change' END,
      'Tagged as ' || COALESCE(v_action, v_personal, v_stage),
      COALESCE(v_action, v_personal),
      v_action_at
    );

    IF v_stage IS NOT NULL THEN
      INSERT INTO public.activity_logs(user_id, prospect_id, activity_type, description, new_value, created_at)
      VALUES (p_user_id, v_prospect_id, 'stage_change', 'Stage set to ' || v_stage, v_stage, v_funnel_at);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.user_daily_tasks(user_id, title, is_active, sort_order)
  VALUES
    (p_user_id,'Attend morning team meeting',true,1),
    (p_user_id,'Make 30 calls',true,2),
    (p_user_id,'Do your follow-ups',true,3),
    (p_user_id,'Attend night team meeting',true,4),
    (p_user_id,'Post 1 Instagram reel / post',true,5)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.todos(user_id, title, completed)
  VALUES (p_user_id, '✅ This is your To-Do list — write what you want to get done today here. (Tick this box once you''ve read it!)', false);

  UPDATE public.profiles
    SET demo_data_created = true,
        total_leads_added = COALESCE(total_leads_added,0) + v_count
    WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'seeded', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_data_for_user(uuid) TO authenticated;

-- 6) Delete demo data for a user
CREATE OR REPLACE FUNCTION public.delete_demo_data_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'teamnevorai@gmail.com') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.activity_logs
    WHERE prospect_id IN (SELECT id FROM public.prospects WHERE user_id = p_user_id AND is_demo = true);

  DELETE FROM public.prospects WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  DELETE FROM public.sheets WHERE user_id = p_user_id AND is_demo = true;

  UPDATE public.profiles SET demo_notice_seen = true WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'deleted', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_demo_data_for_user(uuid) TO authenticated;

-- 7) Admin: replace master demo sheet
CREATE OR REPLACE FUNCTION public.replace_demo_leads_master(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'teamnevorai@gmail.com') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.demo_leads_master;

  INSERT INTO public.demo_leads_master(name, phone, phone2, email, age_or_dob, gender, address, state, profession, sort_order)
  SELECT
    NULLIF(r->>'name',''),
    NULLIF(r->>'phone',''),
    NULLIF(r->>'phone2',''),
    NULLIF(r->>'email',''),
    NULLIF(r->>'age_or_dob',''),
    NULLIF(r->>'gender',''),
    NULLIF(r->>'address',''),
    NULLIF(r->>'state',''),
    NULLIF(r->>'profession',''),
    COALESCE(NULLIF(r->>'sort_order','')::int, ord::int)
  FROM jsonb_array_elements(p_rows) WITH ORDINALITY t(r, ord)
  WHERE COALESCE(r->>'name','') <> '' AND COALESCE(r->>'phone','') <> '';

  SELECT count(*) INTO v_count FROM public.demo_leads_master;
  RETURN jsonb_build_object('success', true, 'rows', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_demo_leads_master(jsonb) TO authenticated;
