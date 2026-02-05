
-- courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  access_type TEXT NOT NULL DEFAULT 'free',
  price INTEGER NOT NULL DEFAULT 0,
  upi_id TEXT,
  qr_image_url TEXT,
  sequential_unlock BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published courses"
  ON courses FOR SELECT USING (is_published = true);

CREATE POLICY "Owner can manage courses"
  ON courses FOR ALL USING (owner_user_id = auth.uid());

-- course_videos table
CREATE TABLE IF NOT EXISTS course_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  video_asset_id UUID NOT NULL,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE course_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read course videos of published courses"
  ON course_videos FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_videos.course_id AND courses.is_published = true));

CREATE POLICY "Owner can manage course videos"
  ON course_videos FOR ALL
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_videos.course_id AND courses.owner_user_id = auth.uid()));

-- course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  payment_status TEXT NOT NULL DEFAULT 'none',
  payment_proof_url TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can enroll" ON course_enrollments FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can read enrollments"
  ON course_enrollments FOR SELECT
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND courses.owner_user_id = auth.uid()));

CREATE POLICY "Anyone can read own enrollment"
  ON course_enrollments FOR SELECT USING (true);

CREATE POLICY "Anyone can update own enrollment"
  ON course_enrollments FOR UPDATE USING (true);

-- course_video_progress table
CREATE TABLE IF NOT EXISTS course_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  course_video_id UUID NOT NULL REFERENCES course_videos(id) ON DELETE CASCADE,
  watch_percentage INTEGER NOT NULL DEFAULT 0,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_position REAL NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, course_video_id)
);

ALTER TABLE course_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read progress" ON course_video_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can insert progress" ON course_video_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update progress" ON course_video_progress FOR UPDATE USING (true);
