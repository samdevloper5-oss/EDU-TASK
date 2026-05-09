'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, ArrowDownLeft, ArrowUpRight, Lock, TrendingUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function WalletPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash')
  const [phone, setPhone] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const [{ data: prof }, { data: txs }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setProfile(prof)
      setTransactions(txs ?? [])
      setPhone(prof?.bkash_number ?? prof?.phone ?? '')
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  const handleDeposit = async () => {
    const amount = Number(depositAmount)
    if (!amount || amount < 100) { toast.error('Minimum deposit is 100 BDT'); return }
    setActionLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setActionLoading(false); return }

    // Simulate 2s processing
    await new Promise((r) => setTimeout(r, 1500))

    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      fee: 0,
      net_amount: amount,
      method,
      status: 'completed',
      notes: `Deposit via ${method}`,
    })

    if (txError) { toast.error(txError.message); setActionLoading(false); return }

    const { error: updateError } = await supabase.from('users').update({
      wallet_balance: (profile?.wallet_balance ?? 0) + amount,
    }).eq('id', user.id)

    if (updateError) { toast.error(updateError.message); setActionLoading(false); return }

    toast.success(`Deposited ${amount} BDT successfully!`)
    setProfile((p: any) => ({ ...p, wallet_balance: (p?.wallet_balance ?? 0) + amount }))
    setDepositAmount('')
    setTransactions((prev) => [{
      id: Date.now(),
      type: 'deposit',
      amount,
      status: 'completed',
      created_at: new Date().toISOString(),
      notes: `Deposit via ${method}`,
    }, ...prev])
    setActionLoading(false)
  }

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount)
    if (!amount || amount < 100) { toast.error('Minimum withdrawal is 100 BDT'); return }
    if (amount > (profile?.wallet_balance ?? 0)) { toast.error('Insufficient balance'); return }
    setActionLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setActionLoading(false); return }

    await new Promise((r) => setTimeout(r, 1500))

    const fee = Math.round(amount * 0.08)
    const net = amount - fee

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount,
      fee,
      net_amount: net,
      method,
      status: 'completed',
      notes: `Withdrawal to ${method} ${phone}`,
    })

    await supabase.from('users').update({
      wallet_balance: (profile?.wallet_balance ?? 0) - amount,
    }).eq('id', user.id)

    toast.success(`Withdrew ${net} BDT (${fee} BDT fee)`)
    setProfile((p: any) => ({ ...p, wallet_balance: (p?.wallet_balance ?? 0) - amount }))
    setWithdrawAmount('')
    setActionLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Wallet</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 border-border text-center">
          <Wallet className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-xl font-bold">{(profile?.wallet_balance ?? 0).toLocaleString()}৳</p>
        </Card>
        <Card className="p-5 border-border text-center">
          <Lock className="w-5 h-5 mx-auto mb-2 text-amber-500" />
          <p className="text-xs text-muted-foreground">In Escrow</p>
          <p className="text-xl font-bold">{(profile?.escrow_balance ?? 0).toLocaleString()}৳</p>
        </Card>
        <Card className="p-5 border-border text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
          <p className="text-xs text-muted-foreground">Total Earned</p>
          <p className="text-xl font-bold">{(profile?.total_earned ?? 0).toLocaleString()}৳</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><ArrowDownLeft className="w-4 h-4 text-emerald-500" /> Deposit</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (min 100৳)</Label>
              <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="500" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm">
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1" />
            </div>
            <Button onClick={handleDeposit} disabled={actionLoading} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deposit'}
            </Button>
          </div>
        </Card>

        <Card className="p-5 border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-red-500" /> Withdraw</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (min 100৳)</Label>
              <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="500" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full mt-1 h-9 rounded-md border border-border bg-background px-2 text-sm">
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1" />
            </div>
            <Button onClick={handleWithdraw} disabled={actionLoading} className="w-full bg-red-500 text-white hover:bg-red-600">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Transaction History</h2>
        <Card className="border-border divide-y divide-border">
          {transactions.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No transactions yet</div>}
          {transactions.map((tx: any) => (
            <div key={tx.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tx.type === 'deposit' || tx.type === 'earning' ? 'bg-emerald-500/10 text-emerald-500' :
                  tx.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {tx.type === 'deposit' || tx.type === 'earning' ? <ArrowDownLeft className="w-4 h-4" /> :
                   tx.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()} · {tx.status}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${
                tx.type === 'deposit' || tx.type === 'earning' ? 'text-emerald-500' :
                tx.type === 'withdrawal' ? 'text-red-500' : 'text-foreground'
              }`}>
                {tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-'}{tx.amount.toLocaleString()}৳
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
