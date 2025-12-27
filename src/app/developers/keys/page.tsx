'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Key,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ApiKey {
  id: string
  name: string | null
  key_prefix: string
  tier: string
  monthly_limit: number
  is_active: boolean
  created_at: string
  last_used_at: string | null
  usage_count: number
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setUser({ id: user.id, email: user.email || '' })
      await loadKeys(user.id)
    }
    setLoading(false)
  }

  const loadKeys = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setKeys(data)
    }
  }

  const createKey = async () => {
    if (!user || !newKeyName.trim()) return

    setCreatingKey(true)
    try {
      const response = await fetch('/api/developers/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })

      const result = await response.json()

      if (result.success) {
        setNewKeyValue(result.key)
        await loadKeys(user.id)
        setNewKeyName('')
      }
    } catch (error) {
      console.error('Error creating key:', error)
    }
    setCreatingKey(false)
  }

  const deleteKey = async (keyId: string) => {
    if (!user) return

    try {
      const response = await fetch(`/api/developers/keys/${keyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadKeys(user.id)
      }
    } catch (error) {
      console.error('Error deleting key:', error)
    }
    setDeleteDialogOpen(false)
    setKeyToDelete(null)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800'
      case 'pro':
        return 'bg-blue-100 text-blue-800'
      case 'business':
        return 'bg-purple-100 text-purple-800'
      case 'enterprise':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/developers">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-xl font-bold">API Keys</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to manage your API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login?redirect=/developers/keys">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/developers">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-xl font-bold">API Keys</h1>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Give your key a descriptive name to identify its purpose.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Production App, Development"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createKey} disabled={creatingKey || !newKeyName.trim()}>
                  {creatingKey && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* New Key Created Alert */}
        {newKeyValue && (
          <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
                <Check className="h-5 w-5" />
                API Key Created
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Copy your API key now. You won&apos;t be able to see it again!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-zinc-900 p-3 rounded-lg font-mono text-sm border">
                  {newKeyValue}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(newKeyValue, 'new')}
                >
                  {copied === 'new' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setNewKeyValue(null)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Keys List */}
        {keys.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first API key to start using the Life Here API.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Give your key a descriptive name to identify its purpose.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name2">Key Name</Label>
                      <Input
                        id="name2"
                        placeholder="e.g., Production App, Development"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createKey} disabled={creatingKey || !newKeyName.trim()}>
                      {creatingKey && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Key
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <Card key={key.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{key.name}</h3>
                        <Badge className={getTierColor(key.tier)}>
                          {key.tier.charAt(0).toUpperCase() + key.tier.slice(1)}
                        </Badge>
                        {!key.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded">
                          {showKey === key.id
                            ? `${key.key_prefix}${'•'.repeat(20)}`
                            : `${key.key_prefix}${'•'.repeat(20)}`}
                        </code>
                        <button
                          onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showKey === key.id ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Dialog open={deleteDialogOpen && keyToDelete === key.id} onOpenChange={(open) => {
                      setDeleteDialogOpen(open)
                      if (!open) setKeyToDelete(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setKeyToDelete(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Delete API Key
                          </DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete &quot;{key.name}&quot;? This action cannot be undone
                            and any applications using this key will stop working.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={() => deleteKey(key.id)}>
                            Delete Key
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium">{formatDate(key.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Used</p>
                      <p className="text-sm font-medium">
                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Usage</p>
                      <p className="text-sm font-medium">
                        {key.usage_count?.toLocaleString() || 0} / {key.monthly_limit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-sm font-medium">
                        {(key.monthly_limit - (key.usage_count || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((key.usage_count || 0) / key.monthly_limit) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upgrade CTA */}
        {keys.length > 0 && keys.every((k) => k.tier === 'free') && (
          <Card className="mt-8 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need More Requests?</h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Pro for 10,000 requests/month
                </p>
              </div>
              <Button asChild>
                <Link href="/developers/pricing">View Plans</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
