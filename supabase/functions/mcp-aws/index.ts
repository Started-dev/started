import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToolRequest {
  tool: string;
  input: Record<string, unknown>;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_region?: string;
}

// Minimal AWS Signature V4 helpers
async function sha256(data: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.digest('SHA-256', data);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmac(new Uint8Array(kDate), region);
  const kService = await hmac(new Uint8Array(kRegion), service);
  const kSigning = await hmac(new Uint8Array(kService), 'aws4_request');
  return kSigning;
}

async function signedRequest(
  method: string,
  url: string,
  service: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  body?: string,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const u = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.substring(0, 8);

  const headers: Record<string, string> = {
    'host': u.host,
    'x-amz-date': amzDate,
    ...(extraHeaders || {}),
  };

  if (body && method !== 'GET') {
    headers['content-type'] = 'application/json';
  }

  const signedHeaderKeys = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('');

  const payloadHash = toHex(await sha256(new TextEncoder().encode(body || '')));

  const canonicalUri = u.pathname || '/';
  const canonicalQuerystring = u.search ? u.search.substring(1) : '';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaderKeys,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    toHex(await sha256(new TextEncoder().encode(canonicalRequest))),
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmac(new Uint8Array(signingKey), stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: {
      ...headers,
      'Authorization': authHeader,
      'x-amz-content-sha256': payloadHash,
    },
    body: method !== 'GET' ? body : undefined,
  });
}

// ─── Tool Handlers ───

async function listS3Buckets(accessKeyId: string, secretAccessKey: string, region: string) {
  const res = await signedRequest('GET', `https://s3.${region}.amazonaws.com/`, 's3', region, accessKeyId, secretAccessKey);
  const text = await res.text();
  if (!res.ok) throw new Error(`S3 error: ${text}`);
  // Parse XML for bucket names
  const buckets = [...text.matchAll(/<Name>(.*?)<\/Name>/g)].map(m => m[1]);
  const dates = [...text.matchAll(/<CreationDate>(.*?)<\/CreationDate>/g)].map(m => m[1]);
  return buckets.map((name, i) => ({ name, createdAt: dates[i] || null }));
}

async function listS3Objects(accessKeyId: string, secretAccessKey: string, region: string, bucket: string, prefix?: string, maxKeys?: number) {
  const params = new URLSearchParams({ 'list-type': '2' });
  if (prefix) params.set('prefix', prefix);
  if (maxKeys) params.set('max-keys', String(maxKeys));
  const res = await signedRequest('GET', `https://${bucket}.s3.${region}.amazonaws.com/?${params}`, 's3', region, accessKeyId, secretAccessKey);
  const text = await res.text();
  if (!res.ok) throw new Error(`S3 error: ${text}`);
  const keys = [...text.matchAll(/<Key>(.*?)<\/Key>/g)].map(m => m[1]);
  const sizes = [...text.matchAll(/<Size>(.*?)<\/Size>/g)].map(m => m[1]);
  return keys.map((key, i) => ({ key, size: sizes[i] || '0' }));
}

async function getS3Object(accessKeyId: string, secretAccessKey: string, region: string, bucket: string, key: string) {
  const res = await signedRequest('GET', `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`, 's3', region, accessKeyId, secretAccessKey);
  if (!res.ok) throw new Error(`S3 error: ${await res.text()}`);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  if (contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml')) {
    return { key, contentType, body: await res.text() };
  }
  return { key, contentType, body: `[Binary content, ${res.headers.get('content-length') || '?'} bytes]` };
}

async function deleteS3Object(accessKeyId: string, secretAccessKey: string, region: string, bucket: string, key: string) {
  const res = await signedRequest('DELETE', `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`, 's3', region, accessKeyId, secretAccessKey);
  if (!res.ok) throw new Error(`S3 error: ${await res.text()}`);
  return { deleted: true, key };
}

async function lambdaListFunctions(accessKeyId: string, secretAccessKey: string, region: string) {
  const res = await signedRequest('GET', `https://lambda.${region}.amazonaws.com/2015-03-31/functions/`, 'lambda', region, accessKeyId, secretAccessKey);
  const data = await res.json();
  if (!res.ok) throw new Error(data.Message || JSON.stringify(data));
  return data.Functions?.map((f: Record<string, unknown>) => ({
    name: f.FunctionName,
    runtime: f.Runtime,
    handler: f.Handler,
    memorySize: f.MemorySize,
    timeout: f.Timeout,
    lastModified: f.LastModified,
  })) || [];
}

async function lambdaGetFunction(accessKeyId: string, secretAccessKey: string, region: string, functionName: string) {
  const res = await signedRequest('GET', `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${encodeURIComponent(functionName)}`, 'lambda', region, accessKeyId, secretAccessKey);
  const data = await res.json();
  if (!res.ok) throw new Error(data.Message || JSON.stringify(data));
  return data;
}

async function lambdaInvoke(accessKeyId: string, secretAccessKey: string, region: string, functionName: string, payload?: unknown) {
  const body = payload ? JSON.stringify(payload) : '{}';
  const res = await signedRequest(
    'POST',
    `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${encodeURIComponent(functionName)}/invocations`,
    'lambda', region, accessKeyId, secretAccessKey, body,
    { 'x-amz-invocation-type': 'RequestResponse' }
  );
  const text = await res.text();
  const functionError = res.headers.get('x-amz-function-error');
  return { statusCode: res.status, functionError, response: text };
}

async function route53ListHostedZones(accessKeyId: string, secretAccessKey: string) {
  const res = await signedRequest('GET', 'https://route53.amazonaws.com/2013-04-01/hostedzone', 'route53', 'us-east-1', accessKeyId, secretAccessKey);
  const text = await res.text();
  if (!res.ok) throw new Error(`Route53 error: ${text}`);
  const ids = [...text.matchAll(/<Id>(.*?)<\/Id>/g)].map(m => m[1]);
  const names = [...text.matchAll(/<Name>(.*?)<\/Name>/g)].map(m => m[1]);
  const counts = [...text.matchAll(/<ResourceRecordSetCount>(.*?)<\/ResourceRecordSetCount>/g)].map(m => m[1]);
  return ids.map((id, i) => ({ id, name: names[i], recordCount: counts[i] }));
}

async function route53ListRecords(accessKeyId: string, secretAccessKey: string, hostedZoneId: string) {
  const zoneId = hostedZoneId.replace('/hostedzone/', '');
  const res = await signedRequest('GET', `https://route53.amazonaws.com/2013-04-01/hostedzone/${zoneId}/rrset`, 'route53', 'us-east-1', accessKeyId, secretAccessKey);
  const text = await res.text();
  if (!res.ok) throw new Error(`Route53 error: ${text}`);
  const records: { name: string; type: string; ttl: string; values: string[] }[] = [];
  const rrsetBlocks = text.split('<ResourceRecordSet>').slice(1);
  for (const block of rrsetBlocks) {
    const name = block.match(/<Name>(.*?)<\/Name>/)?.[1] || '';
    const type = block.match(/<Type>(.*?)<\/Type>/)?.[1] || '';
    const ttl = block.match(/<TTL>(.*?)<\/TTL>/)?.[1] || '0';
    const values = [...block.matchAll(/<Value>(.*?)<\/Value>/g)].map(m => m[1]);
    records.push({ name, type, ttl, values });
  }
  return records;
}

async function stsGetCallerIdentity(accessKeyId: string, secretAccessKey: string, region: string) {
  const body = 'Action=GetCallerIdentity&Version=2011-06-15';
  const res = await signedRequest(
    'POST', `https://sts.${region}.amazonaws.com/`, 'sts', region, accessKeyId, secretAccessKey, body,
    { 'content-type': 'application/x-www-form-urlencoded' }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`STS error: ${text}`);
  const account = text.match(/<Account>(.*?)<\/Account>/)?.[1];
  const arn = text.match(/<Arn>(.*?)<\/Arn>/)?.[1];
  const userId = text.match(/<UserId>(.*?)<\/UserId>/)?.[1];
  return { account, arn, userId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, input, aws_access_key_id, aws_secret_access_key, aws_region }: ToolRequest = await req.json();
    if (!aws_access_key_id || !aws_secret_access_key) {
      return new Response(JSON.stringify({ ok: false, error: 'AWS credentials required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const region = (input.region as string) || aws_region || 'us-east-1';
    let result: unknown;

    switch (tool) {
      case 'aws_verify_credentials':
        result = await stsGetCallerIdentity(aws_access_key_id, aws_secret_access_key, region);
        break;
      case 'aws_list_s3_buckets':
        result = await listS3Buckets(aws_access_key_id, aws_secret_access_key, region);
        break;
      case 'aws_list_s3_objects':
        result = await listS3Objects(aws_access_key_id, aws_secret_access_key, region, input.bucket as string, input.prefix as string, input.max_keys as number);
        break;
      case 'aws_get_s3_object':
        result = await getS3Object(aws_access_key_id, aws_secret_access_key, region, input.bucket as string, input.key as string);
        break;
      case 'aws_delete_s3_object':
        result = await deleteS3Object(aws_access_key_id, aws_secret_access_key, region, input.bucket as string, input.key as string);
        break;
      case 'aws_list_lambda_functions':
        result = await lambdaListFunctions(aws_access_key_id, aws_secret_access_key, region);
        break;
      case 'aws_get_lambda_function':
        result = await lambdaGetFunction(aws_access_key_id, aws_secret_access_key, region, input.function_name as string);
        break;
      case 'aws_invoke_lambda':
        result = await lambdaInvoke(aws_access_key_id, aws_secret_access_key, region, input.function_name as string, input.payload);
        break;
      case 'aws_list_hosted_zones':
        result = await route53ListHostedZones(aws_access_key_id, aws_secret_access_key);
        break;
      case 'aws_list_dns_records':
        result = await route53ListRecords(aws_access_key_id, aws_secret_access_key, input.hosted_zone_id as string);
        break;
      default:
        return new Response(JSON.stringify({ ok: false, error: `Unknown tool: ${tool}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
