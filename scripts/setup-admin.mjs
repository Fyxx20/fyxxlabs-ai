import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charge les variables d'environnement depuis .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, value] = trimmed.split('=');
    if (key && value) {
      envVars[key] = value.replace(/^["']|["']$/g, '');
    }
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('Assure-toi que .env.local contient:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crée un client Supabase avec la clé de service (accès admin)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: {
    schema: 'public'
  }
});

async function setupAdmin() {
  try {
    console.log('🔧 Démarrage de la configuration admin...\n');

    // ÉTAPE 1: Vérifier si l'utilisateur existe
    console.log('ÉTAPE 1: Vérification du compte m.harea@storepilot.ia...');
    
    const { data: usersData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'm.harea@storepilot.ia');
    
    if (userError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', userError);
      process.exit(1);
    }

    if (!usersData || usersData.length === 0) {
      console.error('❌ ERREUR: Le compte m.harea@storepilot.ia n\'existe pas encore!');
      console.error('➡️  ACTION REQUISE: Créer un compte via l\'interface de signup d\'abord');
      console.error('➡️  URL: http://localhost:3000/signup');
      console.error('➡️  Email: m.harea@storepilot.ia');
      process.exit(1);
    }

    const targetProfile = usersData[0];
    console.log(`✅ Compte trouvé: ${targetProfile.user_id}\n`);
    const userId = targetProfile.user_id;

    // ÉTAPE 2: Mettre à jour le profil
    console.log('ÉTAPE 2: Mise à jour du profil (role=admin, plan=lifetime)...');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        role: 'admin',
        email: 'm.harea@storepilot.ia',
        plan: 'lifetime',
        scans_used: 0,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: null,
        is_banned: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('❌ Erreur lors de la mise à jour du profil:', profileError);
      process.exit(1);
    }
    console.log('✅ Profil mis à jour\n');

    // ÉTAPE 3: Configurer la subscription
    console.log('ÉTAPE 3: Configuration de la subscription (plan=lifetime)...');
    
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        plan: 'lifetime',
        ends_at: null,
        source: 'manual',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (subError) {
      console.error('❌ Erreur lors de la mise à jour de la subscription:', subError);
      process.exit(1);
    }
    console.log('✅ Subscription configurée\n');

    // ÉTAPE 4: Vérification finale
    console.log('ÉTAPE 4: Vérification finale...\n');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile && subscription) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ CONFIGURATION RÉUSSIE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email: ${profile.email}`);
      console.log(`Role: ${profile.role}`);
      console.log(`Plan: ${profile.plan}`);
      console.log(`Scans utilisés: ${profile.scans_used}`);
      console.log(`Banni: ${profile.is_banned}`);
      console.log(`Subscription status: ${subscription.status}`);
      console.log(`Subscription plan: ${subscription.plan}`);
      console.log(`Expires: ${subscription.ends_at || 'JAMAIS (Lifetime)'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🎉 Accès FULL - Scans illimités activés!\n');
    } else {
      console.error('❌ Erreur: Vérification impossible');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécute le setup
setupAdmin();
