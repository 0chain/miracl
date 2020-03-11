/*
   Copyright (C) 2019 MIRACL UK Ltd.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.


    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

     https://www.gnu.org/licenses/agpl-3.0.en.html

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

   You can be released from the requirements of the license by purchasing     
   a commercial license. Buying such a license is mandatory as soon as you
   develop commercial activities involving the MIRACL Core Crypto SDK
   without disclosing the source code of your own applications, or shipping
   the MIRACL Core Crypto SDK with a closed source product.     
*/

/* Finite Field arithmetic  Fp^2 functions */

/* FP2 elements are of the form a+ib, where i is sqrt(-1) */

var FP2 = function(ctx) {
    "use strict";

    /* general purpose constructor */
    var FP2 = function(c, d) {
        if (c instanceof FP2) {
            this.a = new ctx.FP(c.a);
            this.b = new ctx.FP(c.b);
        } else {
            this.a = new ctx.FP(c);
            this.b = new ctx.FP(d);
        }
    };

    FP2.prototype = {
        /* reduce components mod Modulus */
        reduce: function() {
            this.a.reduce();
            this.b.reduce();
        },

        /* normalise components of w */
        norm: function() {
            this.a.norm();
            this.b.norm();
        },

        /* test this=0 ? */
        iszilch: function() {
            return (this.a.iszilch() && this.b.iszilch());
        },

        /* test this=1 ? */
        isunity: function() {
            var one = new ctx.FP(1);
            return (this.a.equals(one) && this.b.iszilch());
        },

        /* conditional copy of g to this depending on d */
        cmove: function(g, d) {
            this.a.cmove(g.a, d);
            this.b.cmove(g.b, d);
        },

        /* test this=x */
        equals: function(x) {
            return (this.a.equals(x.a) && this.b.equals(x.b));
        },

        /* extract a */

		geta: function() {
			return this.a;
		},

        getA: function() {
            return this.a.redc();
        },

        /* extract b */
		getb: function() {
			return this.b;
		},

        getB: function() {
            return this.b.redc();
        },

        /* set from pair of FPs */
        set: function(c, d) {
            this.a.copy(c);
            this.b.copy(d);
        },

        /* set a */
        seta: function(c) {
            this.a.copy(c);
            this.b.zero();
        },

        /* set from two BIGs */
        bset: function(c, d) {
            this.a.bcopy(c);
            this.b.bcopy(d);
        },

        /* set from one ctx.BIG */
        bseta: function(c) {
            this.a.bcopy(c);
            this.b.zero();
        },

        /* copy this=x */
        copy: function(x) {
            this.a.copy(x.a);
            this.b.copy(x.b);
        },

        /* set this=0 */
        zero: function() {
            this.a.zero();
            this.b.zero();
        },

        /* set this=1 */
        one: function() {
            this.a.one();
            this.b.zero();
        },

        sign: function() {
            var p1=this.a.sign();
            var p2=this.b.sign();
            var u=this.a.iszilch()? 1:0;
            p1^=(p1^p2)&u;
            return p1;
        },

        /* negate this */
        neg: function() {
            var m = new ctx.FP(this.a),
                t = new ctx.FP(0);

            m.add(this.b);
            m.neg();
            t.copy(m);
            t.add(this.b);
            this.b.copy(m);
            this.b.add(this.a);
            this.a.copy(t);
        },

        /* conjugate this */
        conj: function() {
            this.b.neg();
            this.b.norm();
        },

        /* this+=a */
        add: function(x) {
            this.a.add(x.a);
            this.b.add(x.b);
        },

        /* this-=x */
        sub: function(x) {
            var m = new FP2(x); 
            m.neg();
            this.add(m);
        },

        rsub: function(x) {
            this.neg();
            this.add(x);
        },

        /* this*=s, where s is FP */
        pmul: function(s) {
            this.a.mul(s);
            this.b.mul(s);
        },

        /* this*=c, where s is int */
        imul: function(c) {
            this.a.imul(c);
            this.b.imul(c);
        },

        /* this*=this */
        sqr: function() {
            var w1 = new ctx.FP(this.a),
                w3 = new ctx.FP(this.a),
                mb = new ctx.FP(this.b);

            w1.add(this.b);
            w3.add(this.a);
            w3.norm();
            this.b.mul(w3);

            mb.neg();
            this.a.add(mb);

            this.a.norm();
            w1.norm();

            this.a.mul(w1);
        },

        /* this*=y */
        /* Now using Lazy reduction - inputs must be normed */
        mul: function(y) {
            var p = new ctx.BIG(0),
                pR = new ctx.DBIG(0),
                A, B, C, D, E, F;

            p.rcopy(ctx.ROM_FIELD.Modulus);
            pR.ucopy(p);

            if ((this.a.XES + this.b.XES) * (y.a.XES + y.b.XES) > ctx.FP.FEXCESS) {
                if (this.a.XES > 1) {
                    this.a.reduce();
                }

                if (this.b.XES > 1) {
                    this.b.reduce();
                }
            }

            A = ctx.BIG.mul(this.a.f, y.a.f);
            B = ctx.BIG.mul(this.b.f, y.b.f);

            C = new ctx.BIG(this.a.f);
            D = new ctx.BIG(y.a.f);

            C.add(this.b.f);
            C.norm();
            D.add(y.b.f);
            D.norm();

            E = ctx.BIG.mul(C, D);
            F = new ctx.DBIG(0);
            F.copy(A);
            F.add(B);
            B.rsub(pR);

            A.add(B);
            A.norm();
            E.sub(F);
            E.norm();

            this.a.f.copy(ctx.FP.mod(A));
            this.a.XES = 3;
            this.b.f.copy(ctx.FP.mod(E));
            this.b.XES = 2;
        },

        /* this^e */
/*
        pow: function(e) {
            var r = new FP2(1),
                w = new FP2(this), 
                z = new ctx.BIG(e),
                bt;

            for (;;) {
                bt = z.parity();
                z.fshr(1);
                if (bt == 1) {
                    r.mul(w);
                }

                if (z.iszilch()) {
                    break;
                }
                w.sqr();
            }

            r.reduce();
            this.copy(r);
        }, */

        qr: function() {
            var c = new FP2(this);
            c.conj();
            c.mul(this);

            return c.geta().qr(null);
        },

        /* sqrt(a+ib) = sqrt(a+sqrt(a*a-n*b*b)/2)+ib/(2*sqrt(a+sqrt(a*a-n*b*b)/2)) */
        sqrt: function() {
            var w1, w2, w3;

            if (this.iszilch()) {
                return;
            }

            w1 = new ctx.FP(this.b);
            w2 = new ctx.FP(this.a);
            w3 = new ctx.FP(this.a);

            w1.sqr();
            w2.sqr();
            w1.add(w2); w1.norm();

            w1 = w1.sqrt(null);

            w2.copy(this.a);
            w2.add(w1);
            w2.norm();
            w2.div2();

            w3.copy(this.a);
            w3.sub(w1);
            w3.norm();
            w3.div2();

            w2.cmove(w3,w3.qr(null))

            w2 = w2.sqrt(null);
            this.a.copy(w2);
            w2.add(w2); w2.norm();
            w2.inverse();
            this.b.mul(w2);
        },

        /* convert this to hex string */
        toString: function() {
            return ("[" + this.a.toString() + "," + this.b.toString() + "]");
        },

        /* this=1/this */
        inverse: function() {
            var w1, w2;

            this.norm();

            w1 = new ctx.FP(this.a);
            w2 = new ctx.FP(this.b);

            w1.sqr();
            w2.sqr();
            w1.add(w2);
            w1.inverse();
            this.a.mul(w1);
            w1.neg();
            w1.norm();
            this.b.mul(w1);
        },

        /* this/=2 */
        div2: function() {
            this.a.div2();
            this.b.div2();
        },

        /* this*=sqrt(-1) */
        times_i: function() {
            var z = new ctx.FP(this.a); //z.copy(this.a);
            this.a.copy(this.b);
            this.a.neg();
            this.b.copy(z);
        },

        /* w*=(1+sqrt(-1)) */
        /* where X*2-(1+sqrt(-1)) is irreducible for FP4, assumes p=3 mod 8 */
        mul_ip: function() {
			var t = new FP2(this);
			var i = ctx.FP.QNRI;
			this.times_i();
			while (i>0)
			{
				t.add(t);
				t.norm();
				i--;
			}
			this.add(t);
			if (ctx.FP.TOWER==ctx.FP.POSITOWER) {
				this.norm();
				this.neg();
			}
        },

        /* w/=(1+sqrt(-1)) */
        div_ip: function() {
			var z=new FP2(1<<ctx.FP.QNRI,1);
			z.inverse();
			this.mul(z);
			if (ctx.FP.TOWER==ctx.FP.POSITOWER) {
				this.neg();
				this.norm();
			}
        }


    };

    return FP2;
};
