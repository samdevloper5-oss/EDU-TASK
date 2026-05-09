"use client"

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Wallet, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  XCircle, Plus, Minus, Loader2, X,
} from 'lucide-react'
import { toast } from 'sonner'

export function WalletPage() {
  const { user, transactions, createDeposit, createWithdrawal } = useApp()
  const [showModal, setShowModal] = useState<'deposit' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTransaction = async () => {
    if (!amount || parseInt(amount) <= 0 || !showModal) return
    setLoading(true)
    try {
      const parsedAmount = parseInt(amount)
      if (showModal === 'deposit') {
        await createDeposit(parsedAmount)
      } else {
        await createWithdrawal(parsedAmount)
      }
      setShowModal(null)
      setAmount('')
      toast.success(`${showModal === 'deposit' ? 'Deposit' : 'Withdrawal request'} submitted!`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />
    return <XCircle className="w-4 h-4 text-destructive" />
  }

  const typeColor = (type: string) => {
    if (type === 'earned') return 'text-emerald-600'
    if (type === 'deposit') return 'text-blue-600'
    if (type === 'withdraw') return 'text-primary'
    return 'text-amber-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Wallet</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage your earnings and payments</p>
      </div>

      {/* Balance Cards */}
      <div className="grid sm:grid-cols-2 gap-5 max-w-xl">
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Current Balance</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{user.balance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BDT</span></p>
        </Card>
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">Pending Escrow</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{user.pendingEscrow.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BDT</span></p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowModal('deposit')} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Deposit
        </Button>
        <Button onClick={() => setShowModal('withdraw')} variant="outline" className="border-border text-foreground gap-2">
          <Minus className="w-4 h-4" /> Withdraw
        </Button>
      </div>

      {/* Transaction History */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-center px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 text-sm text-muted-foreground">{tx.date}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{tx.description}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${typeColor(tx.type)}`}>
                      {tx.type === 'earned' || tx.type === 'deposit' ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-semibold ${
                    tx.type === 'earned' || tx.type === 'deposit' ? 'text-emerald-600' : 'text-foreground'
                  }`}>
                    {tx.type === 'earned' || tx.type === 'deposit' ? '+' : '-'}{tx.amount} BDT
                  </td>
                  <td className="px-6 py-4 text-center">{statusIcon(tx.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-8 border-border bg-card shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {showModal === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
              </h3>
              <button onClick={() => { setShowModal(null); setAmount('') }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Amount (BDT)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="mt-1.5 bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-foreground">Payment Method</Label>
                <div className="mt-1.5 p-3 rounded-xl bg-muted text-sm text-foreground">bKash</div>
              </div>
              <Button
                onClick={handleTransaction}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading || !amount || parseInt(amount) <= 0}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm ${showModal === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

