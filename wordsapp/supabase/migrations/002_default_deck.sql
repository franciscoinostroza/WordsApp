-- Create default deck + flashcards for every new user

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_deck_id UUID;
BEGIN
  -- Create user record
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  -- Create default deck
  INSERT INTO public.decks (user_id, name, description, color)
  VALUES (NEW.id, 'Phrasal Verbs B1-B2', 'Verbos compuestos esenciales para nivel intermedio', '#7eb8a4')
  RETURNING id INTO v_deck_id;

  -- Insert default flashcards
  INSERT INTO public.flashcards (deck_id, user_id, word, translation, definition, example, ipa, part_of_speech) VALUES
  (v_deck_id, NEW.id, 'look forward to', 'Esperar con ilusion / Tener ganas de', 'To feel excited about something that is going to happen', 'I am really looking forward to the weekend.', '/lʊk ˈfɔːrwərd tuː/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'give up', 'Rendirse / Dejar de intentar', 'To stop trying to do something', 'I gave up learning guitar after two weeks.', '/ɡɪv ʌp/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'run out of', 'Quedarse sin', 'To use all of something so there is none left', 'We ran out of milk so I need to go to the store.', '/rʌn aʊt əv/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'figure out', 'Averiguar / Resolver', 'To understand or find a solution to something', 'It took me an hour to figure out how to fix the Wi-Fi.', '/ˈfɪɡər aʊt/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'get along with', 'Llevarse bien con', 'To have a friendly relationship with someone', 'She gets along with everyone in the office.', '/ɡɛt əˈlɔːŋ wɪð/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'put off', 'Posponer / Aplazar', 'To delay doing something', 'I keep putting off going to the dentist.', '/pʊt ɒf/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'turn down', 'Rechazar / Bajar volumen', '1. To refuse an offer 2. To reduce volume', 'He turned down the job offer because the salary was too low.', '/tɜːrn daʊn/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'come up with', 'Idear / Ocurrirse', 'To think of an idea or solution', 'We need to come up with a plan for the party.', '/kʌm ʌp wɪð/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'break down', 'Averiarse / Desglosar', '1. To stop working 2. To separate into parts', 'My car broke down on the highway yesterday.', '/breɪk daʊn/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'call off', 'Cancelar', 'To cancel an event that was planned', 'They called off the wedding at the last minute.', '/kɔːl ɒf/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'look up', 'Buscar / Mejorar', '1. To search for information 2. To improve', 'If you do not know the word, just look it up online.', '/lʊk ʌp/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'bring up', 'Mencionar / Criar', '1. To introduce a topic 2. To raise a child', 'She brought up an interesting point during the meeting.', '/brɪŋ ʌp/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'take after', 'Parecerse a (familiar)', 'To resemble a family member in appearance or character', 'You really take after your mother, same eyes and smile.', '/teɪk ˈɑːftər/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'carry out', 'Llevar a cabo / Realizar', 'To perform or complete a task or plan', 'The company carried out a survey among its employees.', '/ˈkæri aʊt/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'hold on', 'Esperar / Agarrarse', '1. To wait 2. To grip tightly', 'Hold on a moment, I am almost ready.', '/hoʊld ɒn/', 'phrasal verb'),
  (v_deck_id, NEW.id, 'point out', 'Senalar / Hacer notar', 'To indicate or draw attention to something', 'He pointed out several mistakes in the report.', '/pɔɪnt aʊt/', 'phrasal verb');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
