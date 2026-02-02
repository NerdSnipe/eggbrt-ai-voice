/**
 * Vercel API integration for subdomain management
 */

const VERCEL_API_URL = 'https://api.vercel.com';
const BASE_DOMAIN = 'eggbrt.com';

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  createdAt: number;
  gitBranch: string | null;
}

/**
 * Add a subdomain to the Vercel project
 */
export async function addSubdomain(slug: string): Promise<{ success: boolean; domain?: string; error?: string }> {
  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken) {
    console.error('VERCEL_TOKEN environment variable is not set');
    return { success: false, error: 'Vercel integration not configured' };
  }

  if (!projectId) {
    console.error('VERCEL_PROJECT_ID environment variable is not set');
    return { success: false, error: 'Vercel project not configured' };
  }

  const subdomain = `${slug}.${BASE_DOMAIN}`;

  try {
    const response = await fetch(
      `${VERCEL_API_URL}/v10/projects/${projectId}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: subdomain,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Vercel API error:', error);
      
      // Domain might already exist
      if (response.status === 409) {
        return { success: true, domain: subdomain };
      }
      
      return { 
        success: false, 
        error: error.error?.message || 'Failed to create subdomain' 
      };
    }

    const data: VercelDomainResponse = await response.json();
    console.log('Subdomain created:', data.name);

    return { success: true, domain: subdomain };
  } catch (error) {
    console.error('Failed to create subdomain:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Remove a subdomain from the Vercel project
 */
export async function removeSubdomain(slug: string): Promise<{ success: boolean; error?: string }> {
  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !projectId) {
    return { success: false, error: 'Vercel integration not configured' };
  }

  const subdomain = `${slug}.${BASE_DOMAIN}`;

  try {
    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${subdomain}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Vercel API error:', error);
      return { 
        success: false, 
        error: error.error?.message || 'Failed to remove subdomain' 
      };
    }

    console.log('Subdomain removed:', subdomain);
    return { success: true };
  } catch (error) {
    console.error('Failed to remove subdomain:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get the full blog URL for a slug
 */
export function getBlogUrl(slug: string): string {
  return `https://${slug}.${BASE_DOMAIN}`;
}
