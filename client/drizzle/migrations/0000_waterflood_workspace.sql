CREATE TYPE public.app_role AS ENUM ('operator','engineer','admin');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL DEFAULT 'operator', UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE POLICY role_read ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.assign_operator() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'operator'); RETURN NEW; END $$;
CREATE TRIGGER assign_waterflood_operator AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_operator();
CREATE TABLE public.wells (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, field_name text NOT NULL, well_type text NOT NULL CHECK(well_type IN ('Injector','Producer')), latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180), status text NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Shut-in','Maintenance')), injection_rate double precision CHECK(injection_rate>=0), oil_rate double precision CHECK(oil_rate>=0), water_rate double precision CHECK(water_rate>=0), water_cut double precision CHECK(water_cut BETWEEN 0 AND 100), pressure double precision CHECK(pressure>=0), measurement_date date NOT NULL DEFAULT CURRENT_DATE, is_sample boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.wells TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.wells TO authenticated; GRANT ALL ON public.wells TO service_role;
ALTER TABLE public.wells ENABLE ROW LEVEL SECURITY;
CREATE POLICY wells_demo ON public.wells FOR SELECT TO anon USING(is_sample);
CREATE POLICY wells_read ON public.wells FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()));
CREATE POLICY wells_admin_create ON public.wells FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY wells_admin_delete ON public.wells FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY wells_update ON public.wells FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()));
CREATE FUNCTION public.validate_well_update() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN IF NEW.id IS DISTINCT FROM OLD.id OR NEW.name IS DISTINCT FROM OLD.name OR NEW.field_name IS DISTINCT FROM OLD.field_name OR NEW.well_type IS DISTINCT FROM OLD.well_type OR NEW.is_sample IS DISTINCT FROM OLD.is_sample THEN RAISE EXCEPTION 'Only administrators can change well identity'; END IF; IF NOT public.has_role(auth.uid(),'engineer') AND (NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude OR NEW.oil_rate IS DISTINCT FROM OLD.oil_rate OR NEW.water_rate IS DISTINCT FROM OLD.water_rate OR NEW.water_cut IS DISTINCT FROM OLD.water_cut OR NEW.pressure IS DISTINCT FROM OLD.pressure) THEN RAISE EXCEPTION 'Engineering information requires an engineer'; END IF; END IF; NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER well_permission_guard BEFORE UPDATE ON public.wells FOR EACH ROW EXECUTE FUNCTION public.validate_well_update();
CREATE TABLE public.relationships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), injector_id uuid NOT NULL REFERENCES public.wells(id) ON DELETE CASCADE, producer_id uuid NOT NULL REFERENCES public.wells(id) ON DELETE CASCADE, distance double precision NOT NULL CHECK(distance>=0), status text NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive')), UNIQUE(injector_id,producer_id));
GRANT SELECT ON public.relationships TO anon; GRANT SELECT,INSERT,UPDATE,DELETE ON public.relationships TO authenticated; GRANT ALL ON public.relationships TO service_role;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY relationship_demo ON public.relationships FOR SELECT TO anon USING(EXISTS(SELECT 1 FROM public.wells WHERE id=injector_id AND is_sample) AND EXISTS(SELECT 1 FROM public.wells WHERE id=producer_id AND is_sample));
CREATE POLICY relationship_read ON public.relationships FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()));
CREATE POLICY relationship_admin ON public.relationships FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.validate_relationship() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.wells WHERE id=NEW.injector_id AND well_type='Injector') OR NOT EXISTS(SELECT 1 FROM public.wells WHERE id=NEW.producer_id AND well_type='Producer') THEN RAISE EXCEPTION 'Relationship must connect an injector to a producer'; END IF; RETURN NEW; END $$;
CREATE TRIGGER relationship_guard BEFORE INSERT OR UPDATE ON public.relationships FOR EACH ROW EXECUTE FUNCTION public.validate_relationship();
CREATE TABLE public.measurements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), well_id uuid NOT NULL REFERENCES public.wells(id) ON DELETE CASCADE, measurement_date date NOT NULL, injection_rate double precision, oil_rate double precision, water_rate double precision, water_cut double precision, pressure double precision, status text NOT NULL, UNIQUE(well_id,measurement_date));
GRANT SELECT ON public.measurements TO anon,authenticated; GRANT ALL ON public.measurements TO service_role;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY measurements_demo ON public.measurements FOR SELECT TO anon USING(EXISTS(SELECT 1 FROM public.wells WHERE id=well_id AND is_sample));
CREATE POLICY measurements_read ON public.measurements FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()));
CREATE TABLE public.thresholds (id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), water_cut double precision NOT NULL DEFAULT 80 CHECK(water_cut BETWEEN 0 AND 100), low_oil double precision NOT NULL DEFAULT 500 CHECK(low_oil>=0), low_injection double precision NOT NULL DEFAULT 2000 CHECK(low_injection>=0), high_pressure double precision NOT NULL DEFAULT 2500 CHECK(high_pressure>=0), decline_pct double precision NOT NULL DEFAULT 20 CHECK(decline_pct BETWEEN 0 AND 100));
GRANT SELECT ON public.thresholds TO anon; GRANT SELECT,UPDATE ON public.thresholds TO authenticated; GRANT ALL ON public.thresholds TO service_role;
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY threshold_read ON public.thresholds FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY threshold_edit ON public.thresholds FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'engineer') OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), well_name text NOT NULL, user_id uuid, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), changes jsonb);
GRANT SELECT ON public.audit_log TO authenticated; GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON public.audit_log FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()));
CREATE FUNCTION public.record_well_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF TG_OP='DELETE' THEN INSERT INTO public.audit_log(well_name,user_id,action,changes) VALUES(OLD.name,auth.uid(),'Deleted',to_jsonb(OLD)); RETURN OLD; END IF; INSERT INTO public.measurements(well_id,measurement_date,injection_rate,oil_rate,water_rate,water_cut,pressure,status) VALUES(NEW.id,NEW.measurement_date,NEW.injection_rate,NEW.oil_rate,NEW.water_rate,NEW.water_cut,NEW.pressure,NEW.status) ON CONFLICT(well_id,measurement_date) DO UPDATE SET injection_rate=EXCLUDED.injection_rate,oil_rate=EXCLUDED.oil_rate,water_rate=EXCLUDED.water_rate,water_cut=EXCLUDED.water_cut,pressure=EXCLUDED.pressure,status=EXCLUDED.status; INSERT INTO public.audit_log(well_name,user_id,action,changes) VALUES(NEW.name,auth.uid(),CASE WHEN TG_OP='INSERT' THEN 'Created' ELSE 'Updated' END,to_jsonb(NEW)); RETURN NEW; END $$;
CREATE TRIGGER well_history AFTER INSERT OR UPDATE OR DELETE ON public.wells FOR EACH ROW EXECUTE FUNCTION public.record_well_change();
CREATE INDEX wells_field ON public.wells(field_name); CREATE INDEX measurements_date ON public.measurements(measurement_date,well_id);
INSERT INTO public.thresholds(id) VALUES(1);
INSERT INTO public.wells(id,name,well_type,field_name,latitude,longitude,injection_rate,oil_rate,water_rate,water_cut,pressure,status,measurement_date,is_sample) VALUES
('00000000-0000-4000-8000-000000000101','INJ-101','Injector','North Field',22.12346,56.123456,4500,NULL,NULL,NULL,2100,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000201','PROD-201','Producer','North Field',22.12510,56.126200,NULL,1200,800,40,NULL,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000202','PROD-202','Producer','North Field',22.12820,56.129300,NULL,650,1850,74,NULL,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000102','INJ-102','Injector','Central Field',21.98765,55.987654,3800,NULL,NULL,NULL,1950,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000203','PROD-203','Producer','Central Field',21.99010,55.990200,NULL,900,1100,55,NULL,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000204','PROD-204','Producer','Central Field',21.99320,55.994100,NULL,400,2100,84,NULL,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000103','INJ-103','Injector','South Field',20.65432,54.654321,2500,NULL,NULL,NULL,2400,'Maintenance','2026-08-01',true),
('00000000-0000-4000-8000-000000000205','PROD-205','Producer','South Field',20.65710,54.658200,NULL,1500,500,25,NULL,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000104','INJ-104','Injector','West Field',23.45679,57.123456,1800,NULL,NULL,NULL,2650,'Active','2026-08-01',true),
('00000000-0000-4000-8000-000000000206','PROD-206','Producer','West Field',23.45920,57.126100,NULL,300,2700,90,NULL,'Shut-in','2026-08-01',true);
INSERT INTO public.relationships(injector_id,producer_id,distance) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',0.4),('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202',0.8),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000203',0.5),('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000204',0.9),
('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000205',0.6),('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000206',0.7);