import { Mail, Phone, User, Shield, Info, Package, Gift } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* App Info */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">InstaMall POS</h1>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          InstaMall is a complete offline point-of-sale and business management system.
          It helps you manage products, track stock, create demands &amp; invoices,
          maintain buyer records, process payments and generate detailed reports —
          all without requiring an internet connection. Designed for pharmacies,
          general stores, and wholesale businesses.
        </p>
      </div>

      {/* Developer Info */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Developer
        </h2>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Asad Ashfaq</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href="tel:03213905471" className="text-primary hover:underline">
              03213905471
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href="mailto:asadashfaq1357@gmail.com" className="text-primary hover:underline">
              asadashfaq1357@gmail.com
            </a>
          </div>
        </div>
      </div>


      {/* Benefits */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Benefits
        </h2>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <ul className="space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>Free Future Updates:</strong> All future software updates, new features, and improvements will be provided to you at no additional cost.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>Cloud Backup (Coming Soon):</strong> In the future, your data will be stored securely in the cloud to protect against data loss from hardware failures or device damage.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>Inventory Management:</strong> Check and manage your complete inventory anytime — track stock levels, monitor product movement, and stay on top of your business.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>Detailed Reports:</strong> Generate sales summaries, profit/loss reports, buyer statements, and outstanding balances to make informed business decisions.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>Buyer &amp; Payment Tracking:</strong> Maintain complete buyer records, track outstanding amounts, and manage payments with ease.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>App Introduction (Coming Soon):</strong> Handling the inventory from distance places. The App will include the management of inventory with multiple beneficial features for remote business operations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">&#10003;</span>
              <span><strong>And Much More :</strong> Label printing, barcode scanning, demand history, audit logs, multi-user access, and many more features to help your business grow.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Usage Policy */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Usage Policy
        </h2>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            By using InstaMall POS, you agree to the following terms and conditions:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-1">
            <li>
              <strong>License:</strong> This software is licensed, not sold. You are granted
              a non-exclusive, non-transferable license to use it on the devices agreed upon
              at the time of purchase.
            </li>
            <li>
              <strong>Data Responsibility:</strong> All business data is stored locally on
              your device. The developer is not responsible for data loss due to hardware
              failure, accidental deletion, or misuse. Regular backups are strongly recommended.
            </li>
            <li>
              <strong>No Redistribution:</strong> You may not copy, distribute, sell, or
              sublicense this software to any third party without written permission from the
              developer.
            </li>
            <li>
              <strong>No Reverse Engineering:</strong> You may not decompile, disassemble, or
              reverse-engineer this software.
            </li>
            <li>
              <strong>Support &amp; Updates:</strong> Technical support and software updates
              are provided at the discretion of the developer. Contact the developer for
              assistance.
            </li>
            <li>
              <strong>Liability:</strong> The software is provided "as is" without warranty
              of any kind. The developer shall not be liable for any damages or losses
              arising from the use of this software.
            </li>
            <li>
              <strong>Termination:</strong> The developer reserves the right to revoke access
              to the software if these terms are violated.
            </li>
          </ol>
          <p className="pt-2 text-xs text-muted-foreground/70">
            For questions about this policy, please contact the developer using the
            information above.
          </p>
        </div>
      </div>
    </div>
  );
}
